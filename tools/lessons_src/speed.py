"""Lesson: Speed, distance and time."""
META = {"id": "speed-distance-time", "title": "Speed, distance and time", "subject": "Physics", "level": "Ages 11-14", "order": 4}
GAP = 0.6
SEGMENTS = [
    {"say": "Speed tells us how fast something moves.",
     "show": [{"at": 0.2, "type": "text", "value": "Speed, distance and time", "x": 50, "y": 11, "size": 7, "weight": 700}]},
    {"say": "A car travels one hundred and twenty kilometres in two hours.",
     "show": [{"at": 0.4, "type": "dot", "x": 12, "y": 55},
              {"at": 0.6, "type": "arrow", "x1": 12, "y1": 55, "x2": 88, "y2": 55, "dur": 1.6},
              {"at": 2.6, "type": "text", "value": "120 km", "x": 50, "y": 48, "size": 5},
              {"at": 4.0, "type": "text", "value": "2 hours", "x": 50, "y": 63, "size": 5, "color": "muted"}]},
    {"say": "To find speed, we divide the distance by the time.",
     "show": [{"at": 0.6, "type": "math", "value": "\\text{speed} = \\dfrac{\\text{distance}}{\\text{time}}", "x": 50, "y": 29, "size": 5.5}]},
    {"say": "So the speed is one hundred and twenty, divided by two.",
     "show": [{"at": 0.6, "type": "math", "value": "\\text{speed} = \\dfrac{120\\ \\text{km}}{2\\ \\text{h}}", "x": 33, "y": 83, "size": 5.5}]},
    {"say": "That is sixty kilometres per hour.",
     "show": [{"at": 0.5, "type": "math", "value": "= 60\\ \\text{km/h}", "x": 70, "y": 83, "size": 6, "color": "accent", "box": True}]},
    {"say": "Remember. Speed equals distance divided by time.",
     "show": [{"at": 0.3, "type": "highlight", "x": 50, "y": 29, "w": 46, "h": 17}]},
]
