-- Optional seed: first program + speakers. Safe to edit before running.
-- Set "startAt" (UTC) once the date is confirmed; until then the page shows no date.
INSERT INTO programs ("slug","title","shortDescription","fullDescription","type","status","locationOrPlatform","whatParticipantsWillLearn","whoItsFor","registrationEnabled","registrationCtaLabel","takeawayCourseTitle","publishedAt")
VALUES (
  'a-balanced-human-in-the-ai-era',
  'A Balanced Human in the AI Era',
  'Balancing Artificial Intelligence with Human Intelligence as a Student.',
  'Three coaches, three perspectives on staying human, working with AI, and creating in the AI era.',
  'WEBINAR','UPCOMING','Telegram (live)',
  E'How to stay human in an AI era\nHow to learn and work with AI as a student\nHow creativity thrives alongside AI',
  'Students, young creatives, beginner developers, designers and AI learners.',
  true,'Register Now','Vibe Coding + Deployment + SEO', now()
) ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "programWebinarDetails" ("programId","subtitle")
SELECT id,'Balancing Artificial Intelligence with Human Intelligence as a Student.' FROM programs WHERE slug='a-balanced-human-in-the-ai-era'
ON CONFLICT ("programId") DO NOTHING;

INSERT INTO speakers ("name","role") SELECT 'Coach Ebunella','The Human' WHERE NOT EXISTS (SELECT 1 FROM speakers WHERE name='Coach Ebunella');
INSERT INTO speakers ("name","role") SELECT 'Coach Jam','The AI User' WHERE NOT EXISTS (SELECT 1 FROM speakers WHERE name='Coach Jam');
INSERT INTO speakers ("name","role") SELECT 'Coach Opeyemi','The Creator' WHERE NOT EXISTS (SELECT 1 FROM speakers WHERE name='Coach Opeyemi');

INSERT INTO "programSpeakers" ("programId","speakerId","topic","displayOrder")
SELECT p.id, s.id, v.topic, v.ord
FROM programs p
JOIN (VALUES ('Coach Ebunella','Staying Human in an AI Era',0),('Coach Jam','Learning & Working With AI as a Student',1),('Coach Opeyemi','Creativity in the AI Era',2)) AS v(name,topic,ord) ON true
JOIN speakers s ON s.name = v.name
WHERE p.slug='a-balanced-human-in-the-ai-era'
  AND NOT EXISTS (SELECT 1 FROM "programSpeakers" ps WHERE ps."programId"=p.id AND ps."speakerId"=s.id);

-- Existing WhatsApp links from the current email template defaults; add Telegram from the admin once admin CRUD UI exists (or insert here).
INSERT INTO "communityLinks" ("key","label","platform","url","displayOrder") VALUES
  ('whatsapp-group','NEXT MIND WhatsApp Community','whatsapp','https://chat.whatsapp.com/JCX4hLJol0sDbzH4PpJGms?s=cl&p=a&mlu=4&ilr=4',0)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "siteSettings" ("featuredProgramId")
SELECT id FROM programs WHERE slug='a-balanced-human-in-the-ai-era' AND NOT EXISTS (SELECT 1 FROM "siteSettings");
