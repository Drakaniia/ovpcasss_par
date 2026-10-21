extract color pallete of the image in the chatgpt

download and install montserrat

test end to end, run the app, watch the terminal for errors or something wrong,, full qa the app flow, read the OVPCASSS-PAPERLESS_PROCESS_FOR_PAR.md for the full flow and process

custom full apple-design ui component

is the @OVPCASSS-PAPERLESS_PROCESS_FOR_PAR.md are seeded? where do it lives?

can we make the admin can do all roles, like if im admin i can still view report.. and can we add in the variables, to boostrap the admin email like ovpcasss@buksu.edu.ph and 2401117078@student.buksu.edu.ph (mine)

fix skelton loader ui

month and year picker in the curent date picker

remove seed indicator in the dropdown ui s, its the official list..
also apple-design the dropdown selectors.. indclude editable dropdown, deletable and addable, in the department, office, levels, etc

move the new report button on the upper right

copy the updater and the ci from C:\Users\Qwenzy\Desktop\CMIS and impliment it. it auto updates when the app opens, show toast progress.. either install and restart (auto when idle), or use current version feature.. and add in settings

Implement a **startup splash screen** that displays a smooth loading animation and the application logo immediately when the user launches the desktop application, before the main window appears. Keep the splash screen visible while the application initializes and loads its required resources, then seamlessly transition to the main interface once everything is ready, ensuring there is no unnecessary delay, flickering, or blank screen. Show it only during startup and maintain a polished, responsive, and professional user experience.

why after submit the request. it did not diplay full ui full proceess in the reviewer page, simialr to approver page

why in reports page, my reports page, its similar across all users, can it be like show only what the current user draft for the submitter for example, and not shared?, or the draft is just localstorage?  
fix also the
fix after i click the new report and i save or exit and it create a draft,, and when i open it again, its the report dont not exist or not acces error

fix login/auath page, it should be dynamically centered with jsut padding to the top, not fully fixed when the layout shortens, make it full responsive

create a sentence promt to generate image in the "Return to the Paperless PAR app to continue." along with this text so its not so plane page after sucecs login, ill provide the image later to impliment

create custom draggable navbar with the 3 actions (minimize, maximize, and close, ), add real deskto bars like file, edit , view, window, help etc..

how the Paperless, Post Activity Report works, interactive,

dont add flat basepoint, cus this is for auth component replacement (left, auth component, right the animated svg)

real email, when its approved, (only google user account or the accounts with email)

full admin privilage

logo image

in password input, add eye and close eye to reveal password.. only show icon on hover the password input or placeholder

apple-design the

add animation when clicking tabs

revew request button not working, or it doesnt do when i click it

in the admin page also did not display all the user list

add shortcut in the makng report page, left and right arrow for clickign next or back.. add also minor indicator ui for that

plan and ask me questions, we are gonna utilize the full advantage of the email integration.. where it must be used or can be used, in the flow of the app because i think it only use in the notification

also should use the original format: OVCPASSS - Paperless Process for the submission of Post Activity Report.eml

refine all with missign apple-design ui with simple implimentation, there are some remaining generic ui implimentation

add app origin in the wrangler worker api, or updarw it using wrangler so it wont just work locall 

ctrol + k, also search for reports feature.. — done 2026-10-21: palette searches every report the role can open (tracking, title, narrative, location, submitter, PIC), previews it, and Ctrl+K works while typing

verification email did not send email

did not sent to the eemail log in admin page

"we could not update passowrd", what if the user login with google, why is there in the settings, current password input?, how to handle this, also it error "we could not update password try again error"

no google oauth in the installed exe or msi file


is the draft report only in suer localstoreage?

---

## Status audit — 2026-10-21

Checked item by item against the working tree. `pnpm verify` (lint, typecheck, tests) passes.

**Still open**

- **Month and year picker**: `CalendarPopover` moves one month at a time; there is no month or year jump.
- **Password reveal**: no show/hide control on the login, register, reset, or profile password inputs.
- **Sign-in handoff illustration**: the "Return to the Paperless PAR app to continue." page is bare HTML in the shell; no image, prompt, or illustration exists.
- **Interactive "How the Post-Activity Report works"**: not in the tree. The first-run tour covers navigation; no workflow explainer screen exists.
- **Dropdown polish**: the wizard's classification fields use the apple-design `EditableSelect` (add/rename/remove); filter bars, admin filters, and search still use native `<select>`.
- **Auth illustration regression**: `ParLine.svelte` and `par-line/` are deleted in the staged working tree, so the animated right-side auth SVG is currently absent.
- **End-to-end QA**: no automated E2E suite; the phase 16 manual acceptance checklists remain unchecked.

**Needs deployed configuration, not code**

- Google sign-in in the installed MSI/EXE needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set as Worker secrets; the installer only carries the API URL.
- Verification and approved mail need `EMAIL_API_KEY` and a verified sender on the deployed Worker.

