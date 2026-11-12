"""Lesson: Solving a linear equation (2x + 3 = 11)."""
META = {"id": "solving-equations", "title": "Solving a linear equation", "subject": "Maths", "level": "Ages 12-14", "order": 2}
GAP = 0.6
SEGMENTS = [
    {"say": "Let's solve an equation. Two x plus three equals eleven.",
     "show": [{"at": 0.2, "type": "text", "value": "Solving an equation", "x": 50, "y": 11, "size": 7, "weight": 700},
              {"at": 1.6, "type": "math", "value": "2x + 3 = 11", "x": 40, "y": 30, "size": 7}]},
    {"say": "Our goal is to get x on its own.",
     "show": [{"at": 0.4, "type": "text", "value": "goal: x on its own", "x": 80, "y": 30, "size": 4.5, "color": "muted"}]},
    {"say": "First, take away three from both sides.",
     "show": [{"at": 0.5, "type": "math", "value": "2x + 3 - 3 = 11 - 3", "x": 40, "y": 45, "size": 5.5, "color": "muted"}]},
    {"say": "That leaves two x equals eight.",
     "show": [{"at": 0.6, "type": "math", "value": "2x = 8", "x": 40, "y": 58, "size": 7}]},
    {"say": "Now divide both sides by two.",
     "show": [{"at": 0.5, "type": "math", "value": "\\frac{2x}{2} = \\frac{8}{2}", "x": 40, "y": 73, "size": 5.5, "color": "muted"}]},
    {"say": "So x equals four.",
     "show": [{"at": 0.4, "type": "math", "value": "x = 4", "x": 40, "y": 89, "size": 6.5, "color": "accent", "box": True}]},
    {"say": "Let's check our answer. Put four back into the equation.",
     "show": [{"at": 0.0, "type": "clear"},
              {"at": 0.2, "type": "text", "value": "Check", "x": 50, "y": 14, "size": 8, "weight": 700},
              {"at": 2.0, "type": "math", "value": "2 \\times 4 + 3", "x": 50, "y": 38, "size": 7}]},
    {"say": "Two times four is eight. Plus three is eleven. It works.",
     "show": [{"at": 0.4, "type": "math", "value": "= 8 + 3", "x": 50, "y": 54, "size": 7},
              {"at": 2.2, "type": "math", "value": "= 11", "x": 50, "y": 70, "size": 7, "color": "accent", "box": True},
              {"at": 3.6, "type": "text", "value": "✓ x = 4 is correct", "x": 50, "y": 87, "size": 5, "color": "accent"}]},
]
