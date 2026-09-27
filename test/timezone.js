/**
 * Every test runs in Sydney time, whatever the Mac is set to.
 *
 * Sydney because it has both things the date code has to survive: it is
 * ahead of UTC like Kuala Lumpur, so an early-morning time is still
 * "yesterday" in UTC (the web planner's toISOString bug), and it has daylight
 * saving, which Kuala Lumpur doesn't, so a day can be 23 or 25 hours long.
 *
 * Set here, in Jest's global setup, because this runs in the parent process
 * before any worker starts; a test file can't change its own time zone.
 */
module.exports = () => {
  process.env.TZ = 'Australia/Sydney';
};
