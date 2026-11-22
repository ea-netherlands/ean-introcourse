-- An early version of /admin/groups saved its URL placeholder ("_none") or an error text
-- ("function(){throw Error(...NO_COHORT...)}") as a group's cohort. Both mean "no cohort".
UPDATE "groups" SET "cohort" = NULL WHERE "cohort" = '_none' OR "cohort" LIKE 'function(%';
