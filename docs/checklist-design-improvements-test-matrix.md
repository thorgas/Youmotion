# Checklist Design improvements — user-observable test matrix

## Feeling Pulse accessibility

| Initial state | Input | Expected visible or announced result |
| --- | --- | --- |
| No feeling selected | Increment or decrement accessibility action | A valid feeling is selected and announced; the touch gesture remains available. |
| Feeling selected | Increment or decrement accessibility action | Intensity changes within the same feeling and the updated nuance is announced. |
| Feeling selected | Next or previous feeling accessibility action | The adjacent feeling is selected at the same intensity and announced. |
| Feeling selected | Activate accessibility action | The selection is confirmed through the same navigation event as releasing the gesture. |
| Any state | Unknown accessibility action | No selection or navigation change occurs. |
| Disabled | Any accessibility action | No selection or navigation change occurs. |

## Feeling Pulse visuals

| Initial state | Input | Expected visual result |
| --- | --- | --- |
| Neutral state | First render | Only the animated ripple field and one raised peak render; no fixed guide waves remain behind them. |
| Not selected | No touch has started | The animated emitter begins at the center of the canvas without a separate static guide layer. |
| User drags selection | Active gesture or intensity change | The raised peak and its animated rings follow the origin offset from the ripple engine. |
| User changes drag position | Active gesture | The current peak follows immediately while one lower-opacity wave field trails the prior position and fades; no second peak appears. |
| Reduce Motion enabled | User changes drag position | The remembered field crossfades briefly at the current position without spatial drift. |

## Tab feedback

| Current destination | Pressed destination | Haptic result | Navigation result |
| --- | --- | --- | --- |
| Same tab | Same tab | No selection haptic | State remains unchanged. |
| Any tab | Different tab | One selection haptic | Root navigation actor receives the existing tab event. |
| Any tab | Different tab | Native haptic rejects | Navigation still proceeds; no error is shown. |

## Support and privacy

| Mail capability | Screenshot choice | Capture result | Expected result |
| --- | --- | --- | --- |
| Available | Continue without screenshot | Not invoked | Composer opens with no attachment. |
| Available | Attach screenshot | Success | Capture occurs only after consent and composer opens with the attachment. |
| Available | Attach screenshot | Failure | A recoverable error is shown; no email opens. |
| Unavailable | Either | N/A | A clear unavailable state is shown with retry and cancel. |
| Any | Dismiss backdrop or cancel | N/A | The support flow closes without composing or capturing. |

## Visual hierarchy and contrast

| Surface | Configuration | Expected result |
| --- | --- | --- |
| History released belief | Light appearance | Small text meets WCAG AA contrast against the paper background while retaining its released treatment. |
| Feeling Pulse prompt | English and German | The gesture mechanics are stated directly without adding height. |
| Belief editor | Create and edit, keyboard hidden and visible | The first editable task appears promptly; existing keyboard scrolling and save behavior remain intact. |

Legal links are intentionally excluded until authoritative Privacy Policy and Terms URLs exist; the app must not link to invented or unrelated destinations.
