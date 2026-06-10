export default async function globalTeardown(): Promise<void> {
  const { closePool } = await import('../helpers/db');
  await closePool();
}
