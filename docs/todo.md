switching new account or adding new account in the profile page shouldn ot navigate back to login page (logout like)...

in the exel export (in the last column), its date recieved, not date requested.

bug cant add multiple PIC, cant add when 2 or more, it says "Check the highlighted fields" even if i already input all requered feild. make sure can add multiple pics

in the narrative report page. dont two , there is input thre is preview.. make sure one input. and the input should directly preview.. no markdown anymore.. just make it direclty on preview mode

when i submit narrative button, and created/draw a signature.. it should automatically save signature.. so i dont have to click save signature and submit narrative.

clicking pdf , after submitted a narrative report, shold open a modal preview.. first

add privacy to the submitted narrative report. after PIC submitted their narrative report.. it should be hidden from the rest of the pic dashboard so no attached iamges or narrative will be seen to others. only the admin once it is submittted, and the person submitting it (or add simple message to the submitter pic that the report only show in their end and the ovpcass)

make the field input "campus, college, department, office" optional so i can still proceed next when creating a record

in the location input.. make a multiple location input, add new locaation button.. not just one lcoatin input

dont accept docx. only images and or pdf

in the repository exports, or in the reports page,, or when should its best fit. fature to be able to edit or modify the Date Completed of the narrative report

the acknowldegemtn export its a4, but diplicate acknowledgement receipt, what is the half of the a4? i want to cut its size,, and the reciept should only one page,, and no ecess whitespace

email integration send email for the pic along with the acknowldegement receipt.. well use personal email for now but the sender is ovpcass email is that possible? because we dont have acces to the admin@buksu.edu.ph email.. ask me qeustions or what do i need like veariables for the sender? or is there free email for cloudflare?

add in the seed or where do we add the other colleges and departments, become some colleges or departments did not added yet:.. read @colleges.xlsx

Two things you must do before deploying

1. Brevo → Senders & IP → Senders: add floresaybaez574@gmail.com (or whichever address you want as sender) and click the confirmation link. SMTP & API → API Keys: create a key, then cd apps/api && npx wrangler secret put EMAIL_API_KEY and paste it — it overwrites the Resend key in the same slot.
2. Your local apps/api/.dev.vars still has EMAIL_FROM="OVPCASSS PAR <onboarding@resend.dev>" , which overrides wrangler.toml under wrangler dev ; Brevo will refuse that sender. Change it to the verified address, or set EMAIL_PROVIDER=console locally.

Until that secret is set on the Worker, sends fail with a Brevo auth error — so set it before wrangler deploy . One caveat worth knowing: a verified Gmail sender is accepted but isn't authenticated for the university, so some receivers may file it as bulk; switch back to resend with no-reply@send.buksu.edu.ph once the domain verifies.

is there email send verified when the record or the narrative report is been approved?, all email feature?

when archived an report.. it should be able to delete a report with a confirmation modal.. and the ar number should decrement each (show message that the ar number)

apple-design. redesign all home pge for admin and PIC, use all design skills

full email integration audit. if it can actually send email to the PIC for all cases

the admin page should be able to preview the submitted attachment by the pic. eithter pdf or images or all

remove the text optional

in the campus, or college or unit, or department or Office dropdown,, there is only edit and delte of the list, but i want that before the text "Edits apply to the official list for everyone. F2 rename · Shift+Delete remove." in the left side, creat a button to add in that list of the dropdown, not just edit and delete the list

in the 2nd step "Number of activities*
1
How many sessions or days this record covers."

its not number of activities - it is Number of days.. it should automatically incriment based on the start date and end date..

in the step 3 of 3, make the two "Email of person in charge", and "Phone of person in charge 1" field optional, but dont display the word optional (remove the grey word optional in it)..

when i click "Create and send" when i filly fillup all 3 steps, it should not loading and send automatically , it should first create a full modal preview first. to review all the input (load apple design for display ui), also add feature in that modal that that field can be edited or have a pencil icon, ant that will navigate to that specific steps or what should the best option to this .... ask_user questions, also add simple ui that when it navigate to that step when i click the pencil icon to edi detail the input should like hihgligt that simply to empahse the edit state.. not too UI but just an active tab indicator

in the admin page, can clear the audit log.. with confirmation modal.. and it will delte the database the logs

in the email log.. rename it to like just email.. and under it it has Log and variables so it has two page under the Email .. the purpose of the new subtab Variables, is that admin can change the EMAIL_FROM and EMAIL_API_KEY, (these variables is stored in the database)

i want to repalce the

the admin skeleton laoder did not match the ui in the /home page, making it inconsistent when the real card appears

add abstract line background also to the after i signin with google and "close this tab page"

fully support mobile view for the PIC

create a modal preview for the preview of the attached image or filed of the PIC when they submit report.. so admin can see its previw at the admin end

when i add my new api key in the email variables input, will the email input still work?
add additional feature in that page to input sample recepietnt email to send email if it work when net neww api key..  (is the main from and the api key (hashed) is also stored in the database? (fallback local in local dev))


in "Report facsimile" print preview.. add  same header or just the logo image similar to the achknoledgement receipt, to add more design to it and make it read pdf

i think the pdf and print button is similar,, remove the print but

in the cretae and send button in the step 3 of 3 when creating report,  when i click it it opens preview, and the same text "create and send", make the create and send rename it to like Preview  so the user know it will preview first then create and send confirmation is in the model



create a promt: how to abosulte care style of email

add the ovpcasss logo in the email header

feature in admin, can edit or modify the  message in the email send. not hardcoded by the system, and can see its preview