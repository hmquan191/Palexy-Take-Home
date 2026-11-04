# Business analysis and design decisions

How the problem was understood, the options considered, the choices made and the known limits. The brief leaves some
points open on purpose (how to convert transactions into staff, how to size a shift from hourly demand, what "fair"
means), so each point below states the assumption used. Vietnamese version: `business-analysis.vi.md`.

## The problem

A store manager must decide who works which shift in a typical week, balancing three things at once:

1. **Demand:** busy hours need more people than quiet ones. Transactions per hour are the measure of how busy it is.
2. **Capacity:** each staff member has a maximum number of hours per week.
3. **Fairness:** nobody should get very few hours while others are full.

The central difficulty: demand is measured **per hour**, but people are assigned **per shift** (a continuous block,
for example 8 hours). The solution therefore has two separate steps:

1. **Sizing (MAX rule, sections 1 and 2):** decide how many people each shift needs.
2. **Assignment (greedy, sections 3 and 4):** decide which people fill those places.

## 1. Demand per hour

`people needed = max(1, ceil(transactions / N))` for every hour that has data. An hour with no data is treated as
closed and needs nobody.

- **N = 15** by default, editable per schedule. On the sample data (about 2 to 64 transactions an hour) the busiest hour
  needs 5 people and the quietest needs 1.
- N is a modelling assumption, not measured productivity. Transactions also capture only part of the work (stocking,
  cleaning and counting are not modelled), so the result is an estimate.

## 2. From hourly demand to shift demand

| Option | People on the shift | Pros | Cons |
|---|---|---|---|
| **MAX** (chosen) | The highest hourly need within the shift | No hour is short against the model; easy to explain and check | Extra people in quiet hours; not cost-optimal |
| Average (rounded up) | The average hourly need | Fewer paid hours | The peak hour is short |
| Flexible shifts | Several short shifts, each sized for its own demand | Less surplus; uses people with few hours left | Shift times must be chosen; harder to read; more complex |

**Choice: MAX.** A short-staffed peak is felt directly by customers, while surplus hours are a cost that can be measured
and shown. Example, Friday 07:00-15:00, hourly needs [2, 2, 2, 3, 3, 2, 5, 3]: MAX gives 5 people, the average gives 3,
which would leave the 13:00 peak (needs 5) two people short.

**Consequence:** on the sample week MAX schedules 352 staff-hours while summing the hourly needs gives 257 (95 more: 37% above the requirement,
or 27% of the scheduled hours). The surplus is shown on the Summary tab, and scenario 3 in the app (four 4-hour blocks) shows shorter shifts
cutting it to 71 hours. Custom shifts are supported, but the app does not search for the best set of shifts.

## 3. Assigning people to shifts

A greedy, deterministic algorithm (same input, same roster). It goes day by day, shift by shift in start-time order,
and fills each open slot with one eligible person:

- **Eligible:** not already on that shift; enough weekly hours left for the whole shift; no overlap with another of
  their shifts; at most 8 hours that day (a shift longer than 8 hours is allowed only as that person's only shift of
  the day).
- **Pick order:** lowest utilization first; ties go to more hours remaining, then name.
- **When nobody eligible is left:** the slot stays open and the result says which shift on which day is short and by
  how many. Nobody is scheduled past their weekly limit to fill it.
- **Manual edits are kept:** placements the user adds or moves are preserved, counted against hours and the daily cap,
  and not replaced by a re-run.

The 8-hour daily cap is an assumption: the brief only rules out overlapping shifts, but two back-to-back 8-hour shifts
would make a 16-hour day, so they are not placed automatically.

## 4. Fairness

**Definition:** utilization = hours assigned / that person's weekly maximum, and the algorithm picks the person with the
lowest value.

Equal absolute hours was rejected because limits differ. With Ann at 40h, Chi at 20h and 48 hours to place, an even
split (24 and 24) pushes Chi over her limit, while a proportional split gives Ann 32h and Chi 16h, both at 80%. On the
sample week with 10 people, utilization stays between 80% and 100% and nobody is left at zero hours.

**Limits:**
- There is no minimum-hours floor. Balance is a consequence of the pick order, not a guarantee. With more people than
  placements, some people necessarily get zero hours.
- The weekly maximum is treated as a ceiling, not as guaranteed contract hours.
- A person whose weekly maximum is smaller than the shortest shift cannot be scheduled at all (for example 6 hours against
  8-hour shifts) and ends at zero hours.
- Only total weekly hours are balanced, not difficult shifts (weekends, evenings), and preferences are not considered.
- Shifts are whole blocks, so leftover hours go unused: a person with 20 hours left and 8-hour shifts can take two more
  and 4 hours stay empty.

## 5. Data and storage

- **Client-side storage:** Zustand with `persist` writing to localStorage; no backend or database. Reason: it runs with
  one or two commands and needs no account. Trade-off: data is per browser and not shared between users. localStorage
  rather than sessionStorage so data survives closing the tab. Unreadable saved data makes the app start empty and tell
  the user.
- **Multiple schedules:** the user can create and switch between schedules.
- **Shifts:** a start and an end time, shared by every day of the week. Defaults 07:00-15:00 and 15:00-23:00. Times are
  whole hours within one day.
- **CSV import:** accepts a different or missing week title, hour rows in any order, labels like `7am`, `1pm` or
  `13:00`, BOM, CRLF and quoted fields. A malformed file (bad hour label, a cell that is not a non-negative whole
  number, mismatched column count) is rejected whole with the line and column, never half-imported. Day columns keep the
  file's order and labels (the sample week runs Friday to Thursday), which avoids silently shifting days when remapping;
  this is one reading of the brief's "treat the columns generically as days of the week". Demand cells can also be edited
  in place, with whole numbers from 0 to 100,000.

## 6. Summary and warnings

- Each (day, hour) cell shows transactions, staff on shift (staff-hours) and transactions per staff-hour. A cell with
  nobody scheduled shows "-".
- Week totals show both **total transactions / total staff-hours** and the **mean of the per-cell ratios** (cells with
  staff only). They differ because the second gives every cell equal weight.
- The model's required staff-hours are shown next to the scheduled ones.
- **Non-blocking warnings:** over the weekly limit, over 8 hours in a day, overlapping shifts, hours below demand. The
  manager can knowingly accept a trade-off. Surplus staff is shown neutrally rather than as a warning, because the MAX
  rule always produces some.

## 7. Known limits

Sizing (MAX rule):
- **Surplus:** quiet hours inside a shift carry extra people, so scheduled staff-hours exceed the model's requirement.
- **Outliers:** one spike hour sets the headcount of the whole shift.
- **Overlapping shifts:** each shift is sized on its own, so they can be overstaffed. This could be improved by
  subtracting demand already covered by other shifts.

Assignment (greedy):
- **Not globally optimal:** when capacity is close to demand it can fill fewer slots than the best possible roster
  (checked against brute force on small instances). When people run out, earlier days are filled first.
- **Fairness limits:** see section 4.

Not modelled: days off and preferences, roles, breaks, shifts across midnight, work that does not create transactions.

## 8. Out of scope

Authentication, multi-user support, deployment. Not built: days off, roles, CSV export, a separate coverage view.
