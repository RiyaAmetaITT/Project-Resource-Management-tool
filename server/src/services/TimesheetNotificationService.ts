import { AllocationRepository } from '../repositories/AllocationRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { ResourceProfile } from '../models/Resource';
import {
  formatDate,
  getLastCompletedWeekStart,
  getNextWorkingDay,
  getTimesheetSubmissionDeadline,
  isSameDay,
  isWorkingDay,
  startOfDay,
} from '../utils/dateUtils';
import { hasActiveAllocationDuringWeek } from '../utils/allocationWeekUtils';

export class TimesheetNotificationService {
  constructor(
    private readonly allocationRepository: AllocationRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly timesheetRepository: TimesheetRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async processNotifications(): Promise<void> {
    const today = startOfDay(new Date());
    if (!isWorkingDay(today)) return;

    const lastWeekStart = getLastCompletedWeekStart(today);
    const employees = await this.resourceRepository.findAllActiveEmployees();

    for (const employee of employees) {
      await this.processEmployee(employee, lastWeekStart, today);
    }
  }

  private async processEmployee(
    employee: ResourceProfile,
    weekStart: Date,
    today: Date,
  ): Promise<void> {
    const hadAllocation = await hasActiveAllocationDuringWeek(
      this.allocationRepository,
      employee.id,
      weekStart,
    );
    if (!hadAllocation) return;

    const timesheet = await this.timesheetRepository.findByResourceAndWeek(employee.id, weekStart);
    if (timesheet?.status === 'SUBMITTED') return;

    const deadline = getTimesheetSubmissionDeadline(weekStart);
    const reminder1Day = getNextWorkingDay(deadline);
    const reminder2Day = getNextWorkingDay(reminder1Day);
    const freezeDay = getNextWorkingDay(reminder2Day);

    if (isSameDay(today, reminder1Day)) {
      await this.sendReminderIfNeeded(employee, weekStart, timesheet, 1);
      return;
    }

    if (isSameDay(today, reminder2Day)) {
      await this.sendReminderIfNeeded(employee, weekStart, timesheet, 2);
      return;
    }

    if (isSameDay(today, freezeDay) && !employee.timesheetAccessFrozen) {
      await this.freezeAccess(employee, weekStart);
    }
  }

  private async sendReminderIfNeeded(
    employee: ResourceProfile,
    weekStart: Date,
    existingTimesheet: Awaited<ReturnType<TimesheetRepository['findByResourceAndWeek']>>,
    reminderNumber: 1 | 2,
  ): Promise<void> {
    let timesheet = existingTimesheet;
    if (!timesheet) {
      await this.timesheetRepository.saveMissed(employee.id, weekStart);
      timesheet = await this.timesheetRepository.findByResourceAndWeek(employee.id, weekStart);
    }

    if (!timesheet || timesheet.reminderCount >= reminderNumber) return;
    if (timesheet.lastReminderSentAt && isSameDay(timesheet.lastReminderSentAt, new Date())) return;

    const weekLabel = formatDate(weekStart);
    const subject = `Timesheet reminder ${reminderNumber}: week of ${weekLabel}`;
    const text =
      `Hi ${employee.fullName},\n\n`
      + `This is reminder ${reminderNumber} that your timesheet for the week starting `
      + `${weekLabel} has not been submitted.\n\n`
      + `Please log in to the PRM Tool and submit your timesheet as soon as possible.\n\n`
      + `— PRM Tool`;

    await this.emailService.send({ to: [employee.email], subject, text });
    await this.timesheetRepository.updateReminderSent(employee.id, weekStart, reminderNumber);
  }

  private async freezeAccess(employee: ResourceProfile, weekStart: Date): Promise<void> {
    const current = await this.resourceRepository.findProfileById(employee.id);
    if (current?.timesheetAccessFrozen) return;

    let timesheet = await this.timesheetRepository.findByResourceAndWeek(employee.id, weekStart);
    if (!timesheet) {
      await this.timesheetRepository.saveMissed(employee.id, weekStart);
      timesheet = await this.timesheetRepository.findByResourceAndWeek(employee.id, weekStart);
    }
    if (timesheet?.status === 'SUBMITTED') return;

    await this.resourceRepository.setTimesheetFrozen(employee.id, weekStart);

    const weekLabel = formatDate(weekStart);
    const employeeText =
      `Hi ${employee.fullName},\n\n`
      + `Your timesheet submission access has been frozen because your timesheet for the week `
      + `starting ${weekLabel} was not submitted after two reminders.\n\n`
      + `You can still log in and view your timesheets, but you cannot create, update, or `
      + `submit entries until your manager restores your access.\n\n`
      + `— PRM Tool`;

    await this.emailService.send({
      to: [employee.email],
      subject: `Timesheet access frozen — week of ${weekLabel}`,
      text: employeeText,
    });

    const managerEmail = await this.resolveManagerEmail(employee.managerId);
    if (managerEmail) {
      const managerText =
        `Hi,\n\n`
        + `${employee.fullName}'s timesheet submission access has been frozen because their `
        + `timesheet for the week starting ${weekLabel} was not submitted after two reminders.\n\n`
        + `Please review the situation and restore access from the Manager menu when appropriate.\n\n`
        + `— PRM Tool`;

      await this.emailService.send({
        to: [managerEmail],
        subject: `Team member timesheet access frozen — ${employee.fullName}`,
        text: managerText,
      });
    }
  }

  private async resolveManagerEmail(managerUserId: number | null): Promise<string | null> {
    if (!managerUserId) return null;
    const manager = await this.userRepository.findById(managerUserId);
    return manager?.email ?? null;
  }
}
