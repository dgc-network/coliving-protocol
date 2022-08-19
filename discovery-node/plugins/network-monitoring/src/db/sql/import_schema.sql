
-- tmp file for dev use

CREATE FOREIGN TABLE public.users
   SERVER fdw_server_connection
   OPTIONS (schema_name 'public', table_name 'dn_users');

CREATE FOREIGN TABLE public.agreements
   SERVER fdw_server_connection
   OPTIONS (schema_name 'public', table_name 'dn_agreements');

CREATE FOREIGN TABLE public.blocks
   SERVER fdw_server_connection
   OPTIONS (schema_name 'public', table_name 'dn_blocks');

CREATE FOREIGN TABLE public.ursm_content_nodes
   SERVER fdw_server_connection
   OPTIONS (schema_name 'public', table_name 'dn_ursm_content_nodes');