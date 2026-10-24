**Hackathon**

Problem: People are not civically engaged right now and there’s no good way for public officials to understand what people want beyond 1\) getting people to the polls or 2\) getting people to come to local office meetings which they just won’t do.

- Mamdani effect \- posting TikTok, “fix this pothole” → people can actually see the impact of local government in a way that engages young people. Also when young people are more engaged with local politics, they are more likely to stay there (this relates to the goal of the Mass AI Coalition. 

**Solution:**   
Consumer

- Four tabs: Weekly Challenges, Report, Rewards, and Account  
- **Weekly Challenges:**   
  - Scrape through local agendas to see what government actually wants to get civilian input.   
  - Loads in new challenges for people to complete (challenges of the week) based on these local agenda items. These challenges count for points and towards an individual’s streak:  
    - The city is redesigning a park or plaza and asking for input. Individuals can build their own versions and the community can vote for their favorite.   
    - Individuals can try to look at the city’s real budget numbers and have to balance it under constraints (“cut 5% without closing a library”) and then people can vote on which proposals they like the best.   
    - Individuals can test city services: report an issue to 311 and time the response, try to renew a permit online, navigate downtown with a stroller or wheelchair. Teams score the experience, and the city gets a usability report.  
    - Individuals can go to city council meetings and take notes on specific issues \+ their thoughts after the meeting and submit them.   
  - These challenges will be visually displayed on the Freedom Trail with each challenge being a monument on the Freedom Trail.   
  - This tab also tracks a users streak (do they complete challenges every day/report something) \- not sure if this should be if a user just does a challenge/every week? Leaning towards every week.  
- **Report**  
  - Individuals can see an animated map of Boston where they can press a report button on the bottom right that allows them to take photos of issues in their neighborhood (that they would normally call 311 for \- ex: graffiti, broken potholes, etc). Then, they are prompted to take a photo of the issue they want to report.   
    - We need to have some way of validating that there is a legitimate issue that they are taking a photo of. Perhaps we ask them to type in their issue before they take a photo so we have an easier way of validating it?   
    - Then, it pops to a second modal where they can input their description of the issue and the location is automatically added using the photo’s location. And then they can submit it.   
  - The issues that are outstanding stay on the map as markers and can be indicated as “red” as outstanding/not reviewed, “yellow” as pending review,and “green” as in progress. Once an issue is validated \- then users get points.  
    - Tentative: should users “lose” points for issues that are not legitimate city concerns?   
    - When users get notified that something has been resolved, they should know who in the government was responsible (what specific local task force, people can become more engaged. The government becomes less of an “entity” and more “people”).   
- **Rewards**  
  - Based on the challenges that individuals complete and the issues that they report that get approved (aka this is an issue that the government can handle, not that the government has actively resolved it) \- then users can earn points.   
    - Users also earn streaks based on if they complete challenges every week. Our thinking is that these streaks can serve as additional points (ex: if you get a streak of 5, that’s \+5 points, and so on) or it can serve as a point multiplier for the existing points.   
  - Based on these rewards, we can partner with local restaurants and businesses to see whether they would actually provide discounts to people for completing these tasks/earning enough points.   
    - These rewards would have to be randomly given whenever a user reached a benchmark (ex: every 5 points).   
  - This would be in the format of a ship on rising water where the water rises more and more as the individuals on the ship throw out wooden crates of tea. Each wooden crate in the ocean would be a reward that users can press to redeem. It would have to be some sort of QR code that businesses can take.  
- **Account**  
  - This tab would include account information (the user information, neighborhood, \# of friends) and allow the user to add friends by putting in their username).   
  - Also would allow users to see notifications (ex: new reward available, friend hit a new streak, etc). 

Government

- 311 data source: data.boston.gov “311 Service Requests - NEW SYSTEM” (resource 254adca6-64ab-4c5c-9fc0-a6da622be185). It has case_id, lat/long, case_status, assigned_department, assigned_team, closure_reason, closure_comments, close_date, and target_close_date. It supports SQL queries, so it can do radius searches for duplicates. It updates through the day; median time to close is about 4.6 hours. submitted_photo and closed_photo are always empty, so duplicates are matched on location + category, not photos. A saved snapshot and notes are in boston-311/.  
- Use 311 API to actively pull issues that are already reported/resolved to update user map   
- Use 311 API to submit new issues \+ see what has already been reported so we don’t double report.   
- Email reports to officials that are listed on government agendas before the deadline based on the user input.   
- Should we have a government end that basically allows officials to list issues? Or put up bounties?

**Conflicts that have been resolved:**  
Scope and platform

* Boston only.  
* Native app: React Native with Expo. Use Expo Go on a real iPhone for camera testing and the demo, and the iOS Simulator (Mac) for UI work.  
* No social sharing.  
* Challenge types are mocked.  
* Agenda scraping runs live once, then the results are pre-seeded for the demo.

Reports

* Photo first (updated 2026-10-24). The flow is:  
  1. Tap Report → the in-app camera opens (no camera roll, so no old or downloaded photos).  
  2. Location is taken from the device at the moment the photo is taken.  
  3. The AI looks at the photo and suggests one of 311’s categories plus a draft description. If it isn’t a real 311/city issue, it is rejected here and never submitted.  
  4. Duplicate check: look for open 311 cases within ~50 m with the same category (live query against the 311 dataset’s lat/long).  
     * Match → show the existing case (category, status, team, how long ago) with a “Me too” button. The user follows that case instead of filing a new one and still earns points.  
     * No match → continue.  
  5. The user confirms or edits the description, then submits. It shows up as a red pin.  
* The AI validates the report. If the AI rejects it, it isn’t submitted to 311\.  
* “Approved” means accepted by 311 (status In progress), and points are awarded then.  
* Duplicate reports are merged on the backend into one 311 ticket. Duplicates still earn points.  
* The same user can’t report the same issue repeatedly (“Me too” on a case they already follow is blocked).  
* The map shows only the user’s own reports (including ones they followed with “Me too”).  
* Map colors, mapped from 311 statuses:  
  * Red: submitted by us, not yet in the 311 dataset, or status Create.  
  * Yellow: Needs Reallocation (311 is routing it to the right team).  
  * Green: In progress (assigned to a team).  
  * Gray: Closed with closure reason Noted (e.g. “No issue found at location”), i.e. rejected.  
  * Closed with reason Resolved: leaves the map and becomes a notification.  
* Resolved issues leave the map and show up in notifications, naming the responsible team (e.g. “Resolved by PWD Street Lighting in 6 hours: ‘Light repaired.’”).  
* For the demo, submission to 311 is mocked (no real tickets in the city queue). Status changes are played back from a real case’s timeline.  
* Penalties apply only to AI-rejected reports. The 3rd invalid report costs 1 point.  
* Reports don’t count toward the streak.

Challenges

* 4–5 challenges per week, displayed on the Freedom Trail.  
* The trail resets weekly and handles both 4 and 5 challenges.  
* The AI assigns point values on a relative scale, guided by examples you provide.  
* Every challenge requires a submission, including notes for meeting attendance.  
* The AI checks meeting notes against the actual meeting.  
* Challenges are done by individuals, not teams.  
* Everyone can vote, but voting is worth fewer points. Users can’t vote on their own submissions.

Streak

* Weekly. Completing 1 challenge per week keeps it alive.  
* The bonus equals the streak week number (week 5 gives \+5 points).  
* Points and rewards  
* Each reward resets the counter to 0\.  
* Reward thresholds: 5, then 10, then 15, then 15 for every reward after that.  
* Redemption is mandatory.  
* Points can’t go below 0\.  
* QR codes are single-use and expire 7 days after they’re issued.  
* Ship visual: crates in the water raise the water and the ship. Redeemed crates turn gray.

Dynamic rewards

* Based on neighborhood and age only.  
* Triggered when a group is under 10% of responses and is the focus of the agenda item.  
* The AI decides the size of the boost.

