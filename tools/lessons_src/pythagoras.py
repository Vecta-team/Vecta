"""Lesson: Pythagoras' theorem (3-4-5 triangle).

Triangle: right angle at A (12, 82), B (39, 82), C (12, 46).
One unit = 12% of board height: AB = 4 units (27% width), AC = 3 units (36% height).
"""
META = {"id": "pythagoras", "title": "Pythagoras' theorem", "subject": "Maths", "level": "Ages 13-15", "order": 3}
GAP = 0.6
SEGMENTS = [
    {"say": "This is Pythagoras' theorem. It works for right angled triangles.",
     "show": [{"at": 0.2, "type": "text", "value": "Pythagoras' theorem", "x": 50, "y": 11, "size": 7, "weight": 700}]},
    {"say": "Here is a right angled triangle. The small square marks the right angle.",
     "show": [{"at": 0.4, "type": "line", "x1": 12, "y1": 82, "x2": 39, "y2": 82, "dur": 0.7},
              {"at": 1.1, "type": "line", "x1": 12, "y1": 82, "x2": 12, "y2": 46, "dur": 0.7},
              {"at": 1.8, "type": "line", "x1": 12, "y1": 46, "x2": 39, "y2": 82, "dur": 0.8},
              {"at": 3.4, "type": "line", "x1": 12, "y1": 77.5, "x2": 14.53, "y2": 77.5, "color": "accent", "dur": 0.2},
              {"at": 3.6, "type": "line", "x1": 14.53, "y1": 77.5, "x2": 14.53, "y2": 82, "color": "accent", "dur": 0.2}]},
    {"say": "The two shorter sides are three and four.",
     "show": [{"at": 0.9, "type": "text", "value": "3", "x": 8.5, "y": 64, "size": 5.5},
              {"at": 1.8, "type": "text", "value": "4", "x": 25.5, "y": 90, "size": 5.5}]},
    {"say": "The longest side is opposite the right angle. It is called the hypotenuse. We call it c.",
     "show": [{"at": 0.4, "type": "line", "x1": 12, "y1": 46, "x2": 39, "y2": 82, "color": "accent", "dur": 0.8},
              {"at": 4.6, "type": "text", "value": "c", "x": 28.5, "y": 59, "size": 6, "color": "accent", "italic": True}]},
    {"say": "The theorem says. A squared, plus b squared, equals c squared.",
     "show": [{"at": 0.8, "type": "math", "value": "a^2 + b^2 = c^2", "x": 70, "y": 28, "size": 7}]},
    {"say": "So three squared, plus four squared, equals c squared.",
     "show": [{"at": 0.4, "type": "math", "value": "3^2 + 4^2 = c^2", "x": 70, "y": 44, "size": 6}]},
    {"say": "Nine plus sixteen is twenty five.",
     "show": [{"at": 0.3, "type": "math", "value": "9 + 16 = 25", "x": 70, "y": 59, "size": 6}]},
    {"say": "c squared is twenty five, so c is the square root of twenty five. That is five.",
     "show": [{"at": 1.2, "type": "math", "value": "c = \\sqrt{25} = 5", "x": 70, "y": 77, "size": 7, "color": "accent", "box": True}]},
]
