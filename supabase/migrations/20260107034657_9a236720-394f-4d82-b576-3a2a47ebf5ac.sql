-- Add is_muted column to backgrounds table for per-background mute setting
ALTER TABLE public.backgrounds ADD COLUMN is_muted boolean NOT NULL DEFAULT true;