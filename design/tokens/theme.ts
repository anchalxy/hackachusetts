// Tea Party design tokens. Generated from tokens.json; keep the two in sync.
export const theme = {
  "color": {
    "bg": "#FCFBF8",
    "surface": "#FFFFFF",
    "border": "#ECE6DA",
    "tile": "#F3EFE6",
    "panel": "#F7F4EE",
    "ink": "#1E2A3A",
    "slate": "#5B6573",
    "mute": "#8A919B",
    "primary": "#2F6F73",
    "brick": "#C2533F",
    "gold": "#B8892E",
    "leaf": {
      "base": "#5DAE72",
      "dark": "#2F7A4E",
      "light": "#9AD3A6",
      "tint": "#EEF6EF",
      "blush": "#F29A8A"
    },
    "badge": {
      "inReview": {
        "bg": "#F6EEDC",
        "fg": "#8A6620"
      },
      "approved": {
        "bg": "#E3EFEC",
        "fg": "#22545A"
      },
      "urgent": {
        "bg": "#F8E4DE",
        "fg": "#9C3F2F"
      },
      "reward": {
        "bg": "#EEF6EF",
        "fg": "#2F7A4E"
      },
      "submitted": {
        "bg": "#ECEEF8",
        "fg": "#4A5891"
      }
    },
    "highlightCard": {
      "bg": "#2F6F73",
      "title": "#FFFFFF",
      "body": "#D7EAE7",
      "meta": "#CFE3E0",
      "waveOpacity": 0.14
    },
    "icon": {
      "teal": [
        "#3F8C8F",
        "#1F4E52"
      ],
      "brick": [
        "#E0694F",
        "#9C3F2F"
      ],
      "gold": [
        "#E9C46A",
        "#A57C2A"
      ],
      "navy": [
        "#4A5D78",
        "#1E2A3A"
      ],
      "green": [
        "#5DAE72",
        "#2F7A4E"
      ],
      "blue": [
        "#6BAED6",
        "#2F6E9A"
      ],
      "wood": [
        "#C98B5A",
        "#7E5233"
      ],
      "stone": [
        "#C3C8CF",
        "#5E6672"
      ],
      "orange": [
        "#F08A4B",
        "#A4512A"
      ],
      "paper": [
        "#FFFFFF",
        "#3A4A5E"
      ],
      "cream": [
        "#F1DEC0",
        "#9C8261"
      ],
      "glow": [
        "#FFE08A",
        "#C99A3B"
      ],
      "asphalt": [
        "#7D8692",
        "#4A525E"
      ],
      "mutedFill": "#F3F0EA",
      "mutedLine": "#8A919B"
    },
    "status": {
      "submitted": {
        "ring": "#7B8CC9",
        "bg": "#ECEEF8",
        "fg": "#4A5891",
        "glyph": "clock"
      },
      "inReview": {
        "ring": "#C99A3B",
        "bg": "#F6EEDC",
        "fg": "#8A6620",
        "glyph": "eye"
      },
      "approved": {
        "ring": "#2F6F73",
        "bg": "#E3EFEC",
        "fg": "#22545A",
        "glyph": "thumbs-up"
      },
      "fixed": {
        "ring": "#3A4A5E",
        "bg": "#E6E9EF",
        "fg": "#1E2A3A",
        "glyph": "check"
      },
      "notApproved": {
        "ring": "#C2533F",
        "bg": "#F8E4DE",
        "fg": "#9C3F2F",
        "glyph": "x"
      }
    },
    "tealTint": "#E6F0EE",
    "userLocation": "#007AFF",
    "map": {
      "land": "#F4F2EC",
      "road": "#FFFFFF",
      "park": "#D5EACB",
      "water": "#B9DCEF",
      "note": "Apple Maps (MapKit) muted standard style; these are only for the mockup"
    }
  },
  "font": {
    "heading": "Bricolage Grotesque",
    "body": "DM Sans"
  },
  "type": {
    "profileName": [
      24,
      700,
      -0.4
    ],
    "heroTitle": [
      20,
      700,
      -0.3
    ],
    "section": [
      18,
      700,
      -0.2
    ],
    "username": [
      17,
      700
    ],
    "row": [
      14,
      400
    ],
    "rowLead": [
      14,
      700
    ],
    "secondary": [
      13.5,
      400
    ],
    "button": [
      13.5,
      600
    ],
    "badge": [
      12.5,
      600
    ],
    "meta": [
      12,
      500
    ],
    "tab": [
      11,
      500
    ]
  },
  "space": {
    "gutter": 20,
    "cardPadding": 16,
    "cardGap": 12,
    "sectionGap": 26,
    "rowHeight": 68,
    "rowTextInset": 58
  },
  "radius": {
    "card": 20,
    "tile": 12,
    "heroTile": 16,
    "badge": 8,
    "button": "pill"
  },
  "size": {
    "button": 32,
    "badge": 26,
    "listIconTile": 44,
    "listIcon": 32,
    "heroIconTile": 64,
    "tabBar": 84,
    "frameWidth": 402
  },
  "icon": {
    "grid": 24,
    "stroke": 1.4,
    "shadeOpacity": [
      0.2,
      0.28
    ],
    "shineOpacity": 0.85,
    "facesOnlyOn": [
      "tea-leaf",
      "avatars"
    ]
  },
  "tabBar": {
    "style": "floating capsule",
    "inset": 16,
    "height": 64,
    "bottomOffset": 34,
    "radius": 32,
    "fill": "#FFFFFF",
    "fillOpacity": 0.94,
    "activePill": "#E6F0EE",
    "activeLabel": "#2F6F73",
    "label": [
      10.5,
      500
    ],
    "activeLabelWeight": 700,
    "icon": 26
  },
  "motion": {
    "sheetSpringMs": 350,
    "crossFadeMs": 150,
    "revereCrossMs": 3300,
    "gallopLegSwapMs": 120,
    "flagPop": {
      "scale": [
        0,
        1.15,
        1
      ],
      "size": 1.7
    },
    "flagHoldMs": 1000,
    "flagLowerMs": 800,
    "photoCheck": {
      "stillLookingAfterMs": 8000,
      "timeoutMs": 20000
    }
  }
} as const;

export type Theme = typeof theme;
export default theme;
