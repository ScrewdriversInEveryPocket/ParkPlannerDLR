// DLR Planner: the planner's tuning numbers, in one place. Changing one changes plans: run the tests (tests/README.md).
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).

// ---------- walking ----------
// paths wind, so the straight line between two map points is stretched by this much
const PATH_WIND = 1.35;
// walking speed in metres a minute through park crowds: WALK_SPEED is Normal pace, and walks are worked out at it;
// PACE_SPEED by the group's pace (relaxed = seniors or small children, normal = middle-aged adults, go-go = young adults)
const WALK_SPEED = 65, PACE_SPEED = { relaxed: 50, normal: 65, fast: 80 };
// with no map point: minutes on the rough land map (data/lands.js) are stretched by WALK_WIND; moves within a land take SAME_LAND_MIN
const WALK_WIND = 1.25, SAME_LAND_MIN = 2;
// minutes on top of walking between rides (restrooms, shops, snacks and distractions), and from the gate to the first ride
const MOVE_EXTRA_MIN = 10, GATE_EXTRA_MIN = 8;
// walks are up to this much slower (0.15 = 15%) in the busiest weeks
const WALK_BUSY_MAX = 0.15;
// how much an extra minute of walking counts against a ride, in the same units as the wait-now / best-later ratio
const WALK_WEIGHT = 0.02;
// waits-vs-steps slider: 0 = shortest waits (walking only costs time), 2 = balanced, 4 = fewest steps
const WALK_FACTOR = [0, 0.4, 1, 2.5, 5], WAIT_WEIGHT = [0.02, 0.01, 0, 0, 0];

// ---------- meals ----------
// minutes for a picked sit-down meal and a lounge, plus SIT_PACE_MIN at Relaxed pace (minus it at Go-go)
const SIT_MIN = 60, LOUNGE_MIN = 45, SIT_PACE_MIN = 10;
// restaurant bookings open this many days ahead
const BOOK_DAYS = 60;

// ---------- restrooms ----------
// a step gets a restroom stop when one is within RR_NEAR_MIN minutes' walk (RR_NEAR_MUST_MIN before a long line or the walk out),
// before a line of RR_LINE_MIN minutes or more (if the last stop was RR_SOON_H hours ago), and otherwise every RR_EVERY_H hours
const RR_NEAR_MIN = 2, RR_NEAR_MUST_MIN = 3, RR_LINE_MIN = 30, RR_EVERY_H = 1.5, RR_SOON_H = 0.33;

// ---------- Park Hopper ----------
// the first hop is not before this hour (11 am)
const HOP_FIRST = 11;

// ---------- midday break ----------
// a hotel break starts between BREAK_FIRST and BREAK_LAST (hours), and within BREAK_NEAR_H hours of the group's "Break around" time
const BREAK_FIRST = 11, BREAK_LAST = 17, BREAK_NEAR_H = 0.5;

// ---------- repeat rides ----------
// the most times one ride can be on a day, and on a whole trip
const REP_DAY_MAX = 3, REP_TRIP_MAX = 6;
