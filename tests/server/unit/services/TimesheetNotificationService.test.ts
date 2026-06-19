import { TimesheetNotificationService } from '../../../../server/src/services/TimesheetNotificationService';
import { AllocationRepository } from '../../../../server/src/repositories/AllocationRepository';
import { ResourceRepository } from '../../../../server/src/repositories/ResourceRepository';
import { TimesheetRepository } from '../../../../server/src/repositories/TimesheetRepository';
import { UserRepository } from '../../../../server/src/repositories/UserRepository';
import { EmailService } from '../../../../server/src/services/EmailService';
import {
  createMockRepo,
  makeResourceProfile,
} from '../../helpers/repositoryMocks';
import {
  addDays,
  getLastCompletedWeekStart,
  getNextWorkingDay,
  getTimesheetSubmissionDeadline,
  startOfDay,
} from '../../../../server/src/utils/dateUtils';

describe('TimesheetNotificationService', () => {
  let allocationRepo: jest.Mocked<AllocationRepository>;
  let resourceRepo: jest.Mocked<ResourceRepository>;
  let timesheetRepo: jest.Mocked<TimesheetRepository>;
  let userRepo: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;
  let service: TimesheetNotificationService;

  beforeEach(() => {
    allocationRepo = createMockRepo<AllocationRepository>();
    resourceRepo = createMockRepo<ResourceRepository>();
    timesheetRepo = createMockRepo<TimesheetRepository>();
    userRepo = createMockRepo<UserRepository>();
    emailService = createMockRepo<EmailService>();
    service = new TimesheetNotificationService(
      allocationRepo,
      resourceRepo,
      timesheetRepo,
      userRepo,
      emailService,
    );
  });

  it('sends reminder 1 on the first working day after the submission deadline', async () => {
    const weekStart = getLastCompletedWeekStart();
    const reminder1Day = getNextWorkingDay(getTimesheetSubmissionDeadline(weekStart));
    jest.useFakeTimers();
    jest.setSystemTime(reminder1Day);

    const employee = makeResourceProfile({ id: 1, managerId: 10 });
    resourceRepo.findAllActiveEmployees.mockResolvedValue([employee]);
    allocationRepo.sumUtilisationInPeriod.mockResolvedValue(50);
    timesheetRepo.findByResourceAndWeek.mockResolvedValue(null);
    timesheetRepo.saveMissed.mockResolvedValue(undefined);
    timesheetRepo.findByResourceAndWeek
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        resourceId: 1,
        weekStartDate: weekStart,
        status: 'MISSED',
        reminderCount: 0,
        lastReminderSentAt: null,
        createdAt: new Date(),
      });
    timesheetRepo.updateReminderSent.mockResolvedValue(undefined);

    await service.processNotifications();

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [employee.email],
        subject: expect.stringContaining('Timesheet reminder 1'),
      }),
    );
    expect(timesheetRepo.updateReminderSent).toHaveBeenCalledWith(1, weekStart, 1);

    jest.useRealTimers();
  });

  it('freezes access and notifies employee and manager after both reminders', async () => {
    const weekStart = getLastCompletedWeekStart();
    const deadline = getTimesheetSubmissionDeadline(weekStart);
    const freezeDay = getNextWorkingDay(getNextWorkingDay(getNextWorkingDay(deadline)));
    jest.useFakeTimers();
    jest.setSystemTime(freezeDay);

    const employee = makeResourceProfile({ id: 2, managerId: 10, timesheetAccessFrozen: false });
    resourceRepo.findAllActiveEmployees.mockResolvedValue([employee]);
    allocationRepo.sumUtilisationInPeriod.mockResolvedValue(100);
    timesheetRepo.findByResourceAndWeek.mockResolvedValue({
      id: 3,
      resourceId: 2,
      weekStartDate: weekStart,
      status: 'MISSED',
      reminderCount: 2,
      lastReminderSentAt: addDays(freezeDay, -1),
      createdAt: new Date(),
    });
    userRepo.findById.mockResolvedValue({
      id: 10,
      email: 'manager@example.com',
    } as never);
    resourceRepo.findProfileById.mockResolvedValue(
      makeResourceProfile({ id: 2, timesheetAccessFrozen: false }),
    );
    resourceRepo.setTimesheetFrozen.mockResolvedValue(undefined);

    await service.processNotifications();

    expect(resourceRepo.setTimesheetFrozen).toHaveBeenCalledWith(2, weekStart);
    expect(emailService.send).toHaveBeenCalledTimes(2);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: [employee.email] }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['manager@example.com'] }),
    );

    jest.useRealTimers();
  });

  it('does not re-send freeze emails when access is already frozen', async () => {
    const weekStart = getLastCompletedWeekStart();
    const deadline = getTimesheetSubmissionDeadline(weekStart);
    const freezeDay = getNextWorkingDay(getNextWorkingDay(getNextWorkingDay(deadline)));
    jest.useFakeTimers();
    jest.setSystemTime(freezeDay);

    const employee = makeResourceProfile({ id: 2, managerId: 10, timesheetAccessFrozen: true });
    resourceRepo.findAllActiveEmployees.mockResolvedValue([employee]);
    allocationRepo.sumUtilisationInPeriod.mockResolvedValue(100);
    timesheetRepo.findByResourceAndWeek.mockResolvedValue({
      id: 3,
      resourceId: 2,
      weekStartDate: weekStart,
      status: 'MISSED',
      reminderCount: 2,
      lastReminderSentAt: addDays(freezeDay, -1),
      createdAt: new Date(),
    });
    resourceRepo.findProfileById.mockResolvedValue(employee);

    await service.processNotifications();

    expect(resourceRepo.setTimesheetFrozen).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('skips notifications on weekends', async () => {
    const saturday = startOfDay(new Date('2026-06-13'));
    jest.useFakeTimers();
    jest.setSystemTime(saturday);

    resourceRepo.findAllActiveEmployees.mockResolvedValue([makeResourceProfile()]);

    await service.processNotifications();

    expect(allocationRepo.sumUtilisationInPeriod).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
