// Knowledge-check pool for the-forty-five. Server-side only (underscore path, not a route).
// Answers never leave the server; /api/check strips them before sending questions.
export default [
  {
    "id": "q1",
    "question": "In this scenario, which decision did the debrief call the night's one load-bearing decision, and why?",
    "options": [
      "Descending to 3,500 feet, because it recovered ten knots of groundspeed",
      "Verifying the opening fuel balance on the ramp, because every later calculation depends on that first number",
      "Leaning to the card number, because it saved about a gallon an hour",
      "Texting Dez about running late, because it removed the pressure"
    ],
    "answer": 1,
    "explanation": "Every calculation downstream of a fuel quantity is only as good as the first number. The board, the line kid, and the gauge were all wrong, and the stick was right.",
    "source": "End_EVV_Fat"
  },
  {
    "id": "q2",
    "question": "According to the scenario's description of 14 CFR 91.151(b), what does the night reserve rule require, and when does it apply?",
    "options": [
      "Enough fuel for the first point of intended landing plus 30 minutes, checked again at each checkpoint in flight",
      "Enough fuel for the first point of intended landing plus 45 minutes at normal cruising speed, judged when the flight begins using the forecast",
      "Enough fuel to reach the alternate plus 45 minutes, judged continuously during the flight",
      "Enough fuel for 45 minutes total, measured by the fuel gauges at takeoff"
    ],
    "answer": 1,
    "explanation": "The rule is a planning rule that judges the moment you begin the flight. A flight can satisfy it at takeoff and still land on fumes.",
    "source": "Preflight-Reserve"
  },
  {
    "id": "q3",
    "question": "How does the scenario distinguish \"minimum fuel\" from declaring an emergency?",
    "options": [
      "Minimum fuel is an advisory that means you can accept no undue delay, with no priority and no paperwork. Emergency fuel is a declaration that gets priority handling",
      "Minimum fuel gets you priority handling, and an emergency declaration only adds paperwork",
      "Both mean the same thing, but minimum fuel is used below 30 minutes of reserve",
      "Minimum fuel is used only after the engine has quit, and an emergency is used before"
    ],
    "answer": 0,
    "explanation": "Minimum fuel is an advisory that removes delay from the arrival. Emergency fuel is a declaration with priority handling. Saying the right word early is free.",
    "source": "End_EVV_MinFuel"
  },
  {
    "id": "q4",
    "question": "In the Archer II, which has two tanks and no BOTH position, what does the scenario say the fuel system asks of you all flight?",
    "options": [
      "Run the fuller tank until it is nearly empty, then switch once and stay there",
      "Pick a tank, take off and land on the fuller one, switch on a schedule, and always know which wing is feeding the engine",
      "Switch tanks whenever the gauges look uneven, since the gauges track the difference",
      "Keep the selector halfway between LEFT and RIGHT to feed from both"
    ],
    "answer": 1,
    "explanation": "With no BOTH, tank discipline is a schedule plus awareness. Takeoff and landing on the fuller tank, and switch by the clock.",
    "source": "Preflight-Aircraft"
  },
  {
    "id": "q5",
    "question": "The squawk sheet says the right fuel gauge showed 3/4 but the tank dipped 11 gallons. What is the correct way to use that information?",
    "options": [
      "Subtract a fixed number of gallons from the right gauge and plan from that",
      "Trust the left gauge and ignore the right one entirely",
      "Treat the gauges as approximate at best, do not plan from them, and use the dipstick and the clock",
      "Trust the right gauge again once the avionics shop replaces the part"
    ],
    "answer": 2,
    "explanation": "The gauge reads high and the squawk says not to trust it for planning. The scenario's answer is the dipstick for quantity and the watch with the burn rate for bookkeeping.",
    "source": "Preflight-Aircraft"
  },
  {
    "id": "q6",
    "question": "At the first checkpoint the groundspeed is 104 knots against a planned 120. What does that mean for fuel?",
    "options": [
      "Nothing, because the burn rate per hour stays the same and only the arrival time changes",
      "The engine burns fuel at the same rate per hour, so each mile now costs more fuel and the destination arrives with less on board than planned",
      "Fuel burn drops with the lower groundspeed, so the plan gets better",
      "The fuel state cannot be judged until after the river crossing"
    ],
    "answer": 1,
    "explanation": "Fuel burns by the hour, not by the mile. A slower groundspeed means more hours to cover the same distance, so the plan's fuel at destination shrinks. Four minutes late is a measurement to work through with a pencil.",
    "source": "Cruise_Math"
  },
  {
    "id": "q7",
    "question": "How did the debrief describe destination fixation, and what broke it?",
    "options": [
      "A habit of checking the destination weather too often, broken by ignoring ATIS",
      "A pull that bends every calculation toward the destination, broken by taking the best available option, the Mount Vernon stop, while it still existed",
      "A fear of night flying, broken by climbing to 5,500 feet",
      "A tendency to over-brief alternates, broken by skipping the ladder of outs"
    ],
    "answer": 1,
    "explanation": "The destination acquires a gravity that bends every calculation toward it. The stop at Mount Vernon broke it with 64 miles still to run.",
    "source": "End_MVN_Stop"
  },
  {
    "id": "q8",
    "question": "What did the scenario say about the difference between looking into the filler necks and using the dipstick?",
    "options": [
      "Looking is just as good if fuel is visible on both sides",
      "Looking shows fuel exists but not how much, since below the collar and above the tabs every tank looks the same, and the stick reads the quantity directly",
      "Looking is better because it does not depend on the airplane being level",
      "The stick is only needed when the gauges disagree with each other"
    ],
    "answer": 1,
    "explanation": "Fuel in the neck says only that there is fuel. The dipstick is the only instrument that reads the opening balance directly.",
    "source": "End_EVV_Blind"
  },
  {
    "id": "q9",
    "question": "The scenario describes a tank running dry in flight and the engine quitting. What restart drill does it describe, and what should you do after the engine catches?",
    "options": [
      "Selector to the other tank, boost pump on, mixture rich. Then land at the nearest pavement instead of pressing for the destination",
      "Mixture to idle cutoff, boost pump off, then wait for the engine to windmill back. Then continue to the destination",
      "Selector to OFF, then back to the same tank, then continue",
      "Carb heat on, throttle closed, then continue to the destination on the same tank"
    ],
    "answer": 0,
    "explanation": "The drill is selector, boost, mixture. An engine that just starved has told you its remaining range is only as trustworthy as your worst number, so the nearest pavement wins.",
    "source": "End_EVV_Downwind"
  },
  {
    "id": "q10",
    "question": "What lesson does the scenario draw about 91.151(b) and personal minimums?",
    "options": [
      "Legal fuel is safe fuel, so planning to the reg is enough",
      "The rule is a low floor set for everyone, not a plan, and a personal fuel plan should sit well above it",
      "Personal minimums matter only for night flights over 200 nm",
      "Personal minimums should be set by the FBO, not the pilot"
    ],
    "answer": 1,
    "explanation": "Forty-five minutes in this airplane is about 7 gallons across two tanks you cannot see into. The scenario calls it a floor, and says legal was doing all the work in that sentence.",
    "source": "Preflight-Reserve"
  }
];
