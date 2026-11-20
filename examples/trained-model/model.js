// Bundled default model for both hosted pages and direct file access.
// Keep this data identical to model.json; the autoplay tests verify parity.
window.TrexDefaultModel = {
  "format": "trex-decision-tree",
  "version": 1,
  "target": "action",
  "input_schema": 1,
  "interval_ms": 50,
  "classes": [
    "duck",
    "jump",
    "run"
  ],
  "feature_names": [
    "ducking",
    "jumping",
    "obstacle_distance",
    "obstacle_height",
    "obstacle_speed",
    "obstacle_type=CACTUS_LARGE",
    "obstacle_type=CACTUS_SMALL",
    "obstacle_type=NONE",
    "obstacle_width",
    "obstacle_y",
    "speed",
    "trex_jump_velocity",
    "trex_x",
    "trex_y"
  ],
  "nodes": [
    {
      "left": 1,
      "right": 2,
      "feature": 11,
      "threshold": 1.902400016784668,
      "action": null
    },
    {
      "left": 3,
      "right": 4,
      "feature": 11,
      "threshold": -4.9964001178741455,
      "action": null
    },
    {
      "left": 7,
      "right": 8,
      "feature": 11,
      "threshold": 5.508399963378906,
      "action": null
    },
    {
      "left": 23,
      "right": 24,
      "feature": 11,
      "threshold": -5.709249973297119,
      "action": null
    },
    {
      "left": 5,
      "right": 6,
      "feature": 11,
      "threshold": -4.386199951171875,
      "action": null
    },
    {
      "left": 17,
      "right": 18,
      "feature": 11,
      "threshold": -4.389800071716309,
      "action": null
    },
    {
      "left": 11,
      "right": 12,
      "feature": 2,
      "threshold": 119.5,
      "action": null
    },
    {
      "left": 9,
      "right": 10,
      "feature": 13,
      "threshold": 22.5,
      "action": null
    },
    {
      "left": 19,
      "right": 20,
      "feature": 10,
      "threshold": 8.253499984741211,
      "action": null
    },
    {
      "left": 163,
      "right": 164,
      "feature": 8,
      "threshold": 8,
      "action": null
    },
    {
      "left": 21,
      "right": 22,
      "feature": 2,
      "threshold": 237,
      "action": null
    },
    {
      "left": 13,
      "right": 14,
      "feature": 2,
      "threshold": 8,
      "action": null
    },
    {
      "left": 59,
      "right": 60,
      "feature": 10,
      "threshold": 6.192499876022339,
      "action": null
    },
    {
      "left": 25,
      "right": 26,
      "feature": 11,
      "threshold": -3.784999966621399,
      "action": null
    },
    {
      "left": 15,
      "right": 16,
      "feature": 2,
      "threshold": 80.5,
      "action": null
    },
    {
      "left": 33,
      "right": 34,
      "feature": 13,
      "threshold": 13.5,
      "action": null
    },
    {
      "left": 29,
      "right": 30,
      "feature": 4,
      "threshold": 6.319999933242798,
      "action": null
    },
    {
      "left": 45,
      "right": 46,
      "feature": 8,
      "threshold": 50.5,
      "action": null
    },
    {
      "left": 93,
      "right": 94,
      "feature": 4,
      "threshold": 7.071000099182129,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 171,
      "right": 172,
      "feature": 10,
      "threshold": 8.255499839782715,
      "action": null
    },
    {
      "left": 53,
      "right": 54,
      "feature": 10,
      "threshold": 6.444000005722046,
      "action": null
    },
    {
      "left": 165,
      "right": 166,
      "feature": 13,
      "threshold": 24.5,
      "action": null
    },
    {
      "left": 71,
      "right": 72,
      "feature": 2,
      "threshold": -27.5,
      "action": null
    },
    {
      "left": 39,
      "right": 40,
      "feature": 13,
      "threshold": 29.5,
      "action": null
    },
    {
      "left": 27,
      "right": 28,
      "feature": 11,
      "threshold": -3.792199969291687,
      "action": null
    },
    {
      "left": 37,
      "right": 38,
      "feature": 12,
      "threshold": 0.5,
      "action": null
    },
    {
      "left": 177,
      "right": 178,
      "feature": 8,
      "threshold": 21,
      "action": null
    },
    {
      "left": 105,
      "right": 106,
      "feature": 7,
      "threshold": 0.5,
      "action": null
    },
    {
      "left": 31,
      "right": 32,
      "feature": 4,
      "threshold": 6.2840001583099365,
      "action": null
    },
    {
      "left": 67,
      "right": 68,
      "feature": 8,
      "threshold": 63,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 137,
      "right": 138,
      "feature": 4,
      "threshold": 6.310500144958496,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 35,
      "right": 36,
      "feature": 2,
      "threshold": 60.5,
      "action": null
    },
    {
      "left": 83,
      "right": 84,
      "feature": 10,
      "threshold": 6.266999959945679,
      "action": null
    },
    {
      "left": 41,
      "right": 42,
      "feature": 2,
      "threshold": 75.5,
      "action": null
    },
    {
      "left": 65,
      "right": 66,
      "feature": 13,
      "threshold": 65.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 49,
      "right": 50,
      "feature": 4,
      "threshold": 7.7754998207092285,
      "action": null
    },
    {
      "left": 167,
      "right": 168,
      "feature": 2,
      "threshold": -16.5,
      "action": null
    },
    {
      "left": 43,
      "right": 44,
      "feature": 4,
      "threshold": 7.499000072479248,
      "action": null
    },
    {
      "left": 57,
      "right": 58,
      "feature": 8,
      "threshold": 42.5,
      "action": null
    },
    {
      "left": 51,
      "right": 52,
      "feature": 4,
      "threshold": 6.39549994468689,
      "action": null
    },
    {
      "left": 115,
      "right": 116,
      "feature": 8,
      "threshold": 33.5,
      "action": null
    },
    {
      "left": 47,
      "right": 48,
      "feature": 2,
      "threshold": 0,
      "action": null
    },
    {
      "left": 63,
      "right": 64,
      "feature": 13,
      "threshold": 22,
      "action": null
    },
    {
      "left": 175,
      "right": 176,
      "feature": 8,
      "threshold": 21,
      "action": null
    },
    {
      "left": 85,
      "right": 86,
      "feature": 9,
      "threshold": 97.5,
      "action": null
    },
    {
      "left": 75,
      "right": 76,
      "feature": 2,
      "threshold": 27,
      "action": null
    },
    {
      "left": 169,
      "right": 170,
      "feature": 9,
      "threshold": 97.5,
      "action": null
    },
    {
      "left": 55,
      "right": 56,
      "feature": 10,
      "threshold": 6.379500150680542,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 95,
      "right": 96,
      "feature": 4,
      "threshold": 7.617500066757202,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 117,
      "right": 118,
      "feature": 10,
      "threshold": 7.950999736785889,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 61,
      "right": 62,
      "feature": 2,
      "threshold": 500.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 173,
      "right": 174,
      "feature": 4,
      "threshold": 6.183500051498413,
      "action": null
    },
    {
      "left": 73,
      "right": 74,
      "feature": 2,
      "threshold": 41,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 107,
      "right": 108,
      "feature": 2,
      "threshold": 106.5,
      "action": null
    },
    {
      "left": 69,
      "right": 70,
      "feature": 2,
      "threshold": 91,
      "action": null
    },
    {
      "left": 87,
      "right": 88,
      "feature": 2,
      "threshold": 86,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 99,
      "right": 100,
      "feature": 11,
      "threshold": -7.077149868011475,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 77,
      "right": 78,
      "feature": 10,
      "threshold": 7.264999866485596,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 79,
      "right": 80,
      "feature": 4,
      "threshold": 6.871000051498413,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 81,
      "right": 82,
      "feature": 10,
      "threshold": 6.36299991607666,
      "action": null
    },
    {
      "left": 97,
      "right": 98,
      "feature": 2,
      "threshold": 13,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 89,
      "right": 90,
      "feature": 1,
      "threshold": 0.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 119,
      "right": 120,
      "feature": 2,
      "threshold": 44.5,
      "action": null
    },
    {
      "left": 91,
      "right": 92,
      "feature": 13,
      "threshold": 14.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 179,
      "right": 180,
      "feature": 4,
      "threshold": 6.507499933242798,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "duck"
    },
    {
      "left": 153,
      "right": 154,
      "feature": 10,
      "threshold": 6.5375001430511475,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 143,
      "right": 144,
      "feature": 9,
      "threshold": 44.5,
      "action": null
    },
    {
      "left": 101,
      "right": 102,
      "feature": 8,
      "threshold": 21,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 103,
      "right": 104,
      "feature": 11,
      "threshold": -7.062299966812134,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 123,
      "right": 124,
      "feature": 2,
      "threshold": 5.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 109,
      "right": 110,
      "feature": 2,
      "threshold": 107.5,
      "action": null
    },
    {
      "left": 111,
      "right": 112,
      "feature": 4,
      "threshold": 6.7204999923706055,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 113,
      "right": 114,
      "feature": 4,
      "threshold": 6.825500011444092,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 147,
      "right": 148,
      "feature": 4,
      "threshold": 7.799999952316284,
      "action": null
    },
    {
      "left": 149,
      "right": 150,
      "feature": 4,
      "threshold": 6.262500047683716,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 127,
      "right": 128,
      "feature": 4,
      "threshold": 6.600499868392944,
      "action": null
    },
    {
      "left": 121,
      "right": 122,
      "feature": 4,
      "threshold": 6.440999984741211,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 125,
      "right": 126,
      "feature": 2,
      "threshold": 1,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 129,
      "right": 130,
      "feature": 8,
      "threshold": 42.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 131,
      "right": 132,
      "feature": 11,
      "threshold": -6.493149995803833,
      "action": null
    },
    {
      "left": 133,
      "right": 134,
      "feature": 4,
      "threshold": 6.445500135421753,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 135,
      "right": 136,
      "feature": 8,
      "threshold": 29.5,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 139,
      "right": 140,
      "feature": 2,
      "threshold": 114,
      "action": null
    },
    {
      "left": 141,
      "right": 142,
      "feature": 4,
      "threshold": 6.315500020980835,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 151,
      "right": 152,
      "feature": 4,
      "threshold": 6.317499876022339,
      "action": null
    },
    {
      "left": 145,
      "right": 146,
      "feature": 10,
      "threshold": 6.009999990463257,
      "action": null
    },
    {
      "left": 157,
      "right": 158,
      "feature": 8,
      "threshold": 21,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "duck"
    },
    {
      "left": 155,
      "right": 156,
      "feature": 11,
      "threshold": 2.8041999340057373,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "duck"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": 159,
      "right": 160,
      "feature": 10,
      "threshold": 7.36050009727478,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": 161,
      "right": 162,
      "feature": 4,
      "threshold": 7.6570000648498535,
      "action": null
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "jump"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    },
    {
      "left": -1,
      "right": -1,
      "feature": -2,
      "threshold": -2,
      "action": "run"
    }
  ]
};
