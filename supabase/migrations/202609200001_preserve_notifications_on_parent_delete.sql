begin;

-- Student deletion also removes guardians with no account or remaining children.
-- Keep notification history while releasing its reference to a removed guardian.
alter table public.notifications
  drop constraint notifications_parent_id_fkey,
  add constraint notifications_parent_id_fkey
    foreign key (parent_id) references public.parents(id) on delete set null;

commit;
