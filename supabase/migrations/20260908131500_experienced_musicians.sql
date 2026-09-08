-- Migration to add is_experienced to users and requires_experienced to events
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_experienced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_experienced BOOLEAN DEFAULT FALSE;

-- Update experienced musicians list
UPDATE public.users 
SET is_experienced = TRUE 
WHERE uid IN (
  '231fef34-e60a-4527-924b-839ed668e43f', -- Jacint Hernández i Escorihuela
  'd37c7f9c-83dc-46fc-9432-fe1d3a1daaed', -- Alex Llàcer Rico
  '212ae4be-0252-47e9-ba4e-ac2377c0a946', -- Miguel Llàcer San Fernando
  'dd7ee80b-23f5-495d-9353-c405ae814a2a', -- Carlos Avinyó Navarro
  'f14ab58e-5652-4d96-a508-3b542703115c', -- Martí Pastor
  'f365ab83-ead0-4927-ac98-de6027abbcb3', -- Javi Julve
  'feb87c65-3d98-4ad1-ac5d-5587e934a7e9', -- Vicent Martínez Sánchez
  'f8b23759-54f6-4eb0-a267-b7661b4f65fe', -- Guillem Taberner
  'ad8dcc8b-76c7-4f7f-b707-2e7f05744b9f', -- Manuel Hernández Fernández (Manu)
  '1eb71d1b-3108-4d9c-a6b5-516039e24fca', -- Marivi Blasco
  '84977ba0-0ab8-4415-86f4-32773d87ac81', -- Aron Primo (Aaron)
  'a4415efd-9c99-40fa-acec-84df734caf9c', -- Pere Bernal Torres
  'man-amparo-tatay',                     -- Amparo Tatay
  'man-reillo-tabal',                     -- Jose Maria Reillo Hernández
  'bbf79962-f13b-473c-a4ec-1ee380426208', -- Paco Luján
  'man-ximo-reillo'                       -- Ximo Reillo Carra
);

-- Recreate member_rotation_stats view to include is_experienced
CREATE OR REPLACE VIEW public.member_rotation_stats AS
SELECT 
  u.uid AS user_id,
  u.name,
  u.instrument,
  member_attendance_score(u.uid) AS score,
  COALESCE(rs.peso_acumulado, 0::numeric) AS peso_acumulado,
  COALESCE(u.is_experienced, FALSE) AS is_experienced
FROM users u
LEFT JOIN rotation_state rs ON u.uid = rs.user_id AND u.instrument = rs.instrument;
