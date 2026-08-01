# Feedback email v1 test matrix

The feedback flow opens the device mail composer. It never sends a message automatically.
A screenshot may contain private reflection content, so capture and attachment require a
separate explicit choice.

| User path or runtime input | Screenshot capture | Mail composer | User-visible result |
| --- | --- | --- | --- |
| Feedback icon, then cancel | Not started | Not started | Current screen remains unchanged. |
| Ask a question, then cancel | Not started | Not started | Current screen remains unchanged. |
| Send feedback, then cancel | Not started | Not started | Current screen remains unchanged. |
| Ask a question without screenshot | Not started | Available | Composer opens to `youmotion@thorgas.com` with a question subject and release metadata. |
| Send feedback without screenshot | Not started | Available | Composer opens to `youmotion@thorgas.com` with a feedback subject and release metadata. |
| Either kind with screenshot | Succeeds | Available | The confirmation UI and feedback icon disappear before capture; composer opens with one temporary PNG attached. |
| Either kind with screenshot | Fails | Not started | An error explains that no screenshot or email was created; retry and cancel are available. |
| Either kind without screenshot | Not started | Unavailable | An error explains that no configured email app is available. |
| Either kind after successful capture | Succeeds | Fails | An error explains that the composer could not open; retry reuses the already captured temporary PNG. |
| Flow is capturing | In progress | Not started | All feedback UI is hidden so the current app screen is captured cleanly; duplicate requests cannot start. |
| Flow is opening mail | Complete or skipped | In progress | A short progress state is visible and duplicate requests cannot start. |

## Runtime-boundary coverage

- Module initialization has no screenshot, recipient, or user identifier state.
- Native inputs are mail availability, screenshot success or failure, and composer success or failure.
- There is no hydration or persistence; screenshots are temporary files owned by the capture library.
- While capture runs, feedback UI is removed before the next native paint. While the composer opens, the overlay shows a short progress state. Both phases block duplicate actions.
- Consumer tests cover the visible choice, confirmation, progress, failure, retry, and cancellation states.
