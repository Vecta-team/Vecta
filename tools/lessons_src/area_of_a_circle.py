"""Lesson: Area of a circle.

Each segment = one narration sentence + the board items that appear while it
is spoken. `at` is a delay in seconds after the sentence starts. The build
step speaks every sentence, measures its length, and writes real timestamps
into lesson.json, so the drawings stay in sync with the voice.

Board coordinates: x and y are 0-100 (% of board width / height, 16:9 board).
Sizes and circle radii are % of board height, so lessons scale to any screen.
"""

SEGMENTS = [
    {"say": "Today, we're going to find the area of a circle.",
     "show": [{"at": 0.2, "type": "text", "value": "Area of a circle", "x": 50, "y": 12, "size": 8, "weight": 700}]},

    {"say": "Here is a circle. The point in the middle is called the center.",
     "show": [{"at": 0.3, "type": "circle", "x": 30, "y": 55, "r": 26, "dur": 1.2},
              {"at": 2.4, "type": "dot", "x": 30, "y": 55},
              {"at": 2.6, "type": "text", "value": "center", "x": 30, "y": 62, "size": 4.5, "color": "muted"}]},

    {"say": "The distance from the center to the edge is called the radius. We call it r.",
     "show": [{"at": 0.8, "type": "line", "x1": 30, "y1": 55, "x2": 44.6, "y2": 55, "color": "accent", "dur": 0.8},
              {"at": 3.6, "type": "text", "value": "r", "x": 37.3, "y": 50, "size": 6, "color": "accent", "italic": True}]},

    {"say": "The area is the amount of space inside the circle.",
     "show": [{"at": 0.4, "type": "fill", "x": 30, "y": 55, "r": 26, "color": "accent"}]},

    {"say": "To find it, we use this formula. A equals pi r squared.",
     "show": [{"at": 1.0, "type": "math", "value": "A = \\pi r^2", "x": 72, "y": 42, "size": 9}]},

    {"say": "Pi is a special number. It is about three point one four.",
     "show": [{"at": 0.8, "type": "math", "value": "\\pi \\approx 3.14", "x": 72, "y": 62, "size": 6, "color": "muted"}]},

    {"say": "Let's try an example. Suppose the radius is three centimetres.",
     "show": [{"at": 0.0, "type": "clear"},
              {"at": 0.2, "type": "text", "value": "Example", "x": 50, "y": 12, "size": 8, "weight": 700},
              {"at": 0.6, "type": "circle", "x": 22, "y": 55, "r": 20, "dur": 1.0},
              {"at": 1.8, "type": "dot", "x": 22, "y": 55},
              {"at": 2.2, "type": "line", "x1": 22, "y1": 55, "x2": 33.25, "y2": 55, "color": "accent", "dur": 0.6},
              {"at": 2.8, "type": "text", "value": "r = 3 cm", "x": 26.5, "y": 61, "size": 4, "color": "accent"}]},

    {"say": "We put three into the formula. A equals pi, times three squared.",
     "show": [{"at": 0.3, "type": "math", "value": "A = \\pi r^2", "x": 66, "y": 30, "size": 6},
              {"at": 2.2, "type": "math", "value": "A = \\pi \\times 3^2", "x": 66, "y": 44, "size": 6}]},

    {"say": "Three squared is nine. So A equals nine pi.",
     "show": [{"at": 1.4, "type": "math", "value": "A = 9\\pi", "x": 66, "y": 58, "size": 6}]},

    {"say": "Nine times three point one four is about twenty eight point three.",
     "show": [{"at": 0.4, "type": "math", "value": "A \\approx 9 \\times 3.14", "x": 66, "y": 72, "size": 6}]},

    {"say": "So the area is about twenty eight point three square centimetres.",
     "show": [{"at": 0.6, "type": "math", "value": "A \\approx 28.3\\ \\text{cm}^2", "x": 66, "y": 87, "size": 6.5, "color": "accent", "box": True}]},

    {"say": "Remember. A equals pi r squared. Square the radius first, then multiply by pi.",
     "show": [{"at": 0.0, "type": "clear"},
              {"at": 0.2, "type": "text", "value": "Remember", "x": 50, "y": 18, "size": 8, "weight": 700},
              {"at": 1.0, "type": "math", "value": "A = \\pi r^2", "x": 50, "y": 45, "size": 12, "color": "accent", "box": True},
              {"at": 3.6, "type": "text", "value": "1. Square the radius", "x": 50, "y": 70, "size": 5},
              {"at": 5.2, "type": "text", "value": "2. Multiply by π", "x": 50, "y": 80, "size": 5}]},
]

# Pause after each sentence (seconds) so the board can settle.
GAP = 0.6

META = {"id": "area-of-a-circle", "title": "Area of a circle", "subject": "Maths", "level": "Ages 11-14", "order": 1}
