switching new account or adding new account in the profile page shouldn ot navigate back to login page (logout like)...

in the exel export (in the last column), its date recieved, not date requested.

bug cant add multiple PIC, cant add when 2 or more, it says "Check the highlighted fields"  even if i already input all requered feild. make sure can add multiple pics


in the narrative report page. dont two , there is input thre is preview.. make sure one input. and the input should directly preview.. no  markdown anymore.. just make it direclty on preview mode 

when i submit narrative button, and created/draw a signature.. it should automatically save signature.. so i dont have to click save signature and submit narrative.


clicking pdf , after submitted a narrative report, shold open a modal preview.. first


add privacy  to the submitted narrative report. after PIC submitted their narrative report..   it should be hidden from the rest of the pic dashboard so no attached iamges or narrative will be seen to others. only the admin once it is submittted, and the person submitting it (or add simple message to the submitter pic that the report only show in their end and the ovpcass)

make the field input "campus, college, department, office" optional so i can still proceed next when creating a record

 in the location input.. make a multiple location input, add new locaation button.. not just one lcoatin input

 dont accept docx.  only images and or pdf 


 in the repository exports, or in the reports page,,  or when should its best fit.  fature to be able to edit or modify the Date Completed of the narrative report


 the acknowldegemtn export  its a4, but diplicate acknowledgement receipt,  what is the half of the a4? i want to cut its size,, and the reciept should only one page,, and no ecess  whitespace

 email integration  send email for the pic along with the acknowldegement receipt.. well use personal email for now but the sender is ovpcass email is that possible?  because we dont have acces to the admin@buksu.edu.ph email.. ask me qeustions  or what do i need like veariables for the sender?  or is there free email for cloudflare?



 add in the seed or where do we add the other colleges and departments,  become some colleges or departments did not added yet:.. read @colleges.xlsx


 Two things you must do before deploying

1. Brevo → Senders & IP → Senders: add  floresaybaez574@gmail.com  (or whichever address you want as sender) and click the confirmation link. SMTP & API → API Keys: create a key, then  cd apps/api && npx wrangler secret put EMAIL_API_KEY  and paste it — it overwrites the Resend key in the same slot.
2. Your local  apps/api/.dev.vars  still has  EMAIL_FROM="OVPCASSS PAR <onboarding@resend.dev>" , which overrides  wrangler.toml  under  wrangler dev ; Brevo will refuse that sender. Change it to the verified address, or set  EMAIL_PROVIDER=console  locally.

Until that secret is set on the Worker, sends fail with a Brevo auth error — so set it before  wrangler deploy . One caveat worth knowing: a verified Gmail sender is accepted but isn't authenticated for the university, so some receivers may file it as bulk; switch back to  resend  with  no-reply@send.buksu.edu.ph  once the domain verifies.