'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';

// Task 56: Complete the flashcards, code, and SCORM lesson builders

// --- 1. SCORM Lesson Builder Engine ---
export async function uploadScormPackage(lessonId: string, file: File) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    if (!file.name.endsWith('.zip')) {
      return { success: false, error: 'SCORM packages must be a valid .zip file.' };
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the zip in memory to look for the SCORM manifest
    const directory = await unzipper.Open.buffer(buffer);
    const manifestFile = directory.files.find((d: any) => d.path === 'imsmanifest.xml');
    
    if (!manifestFile) {
      return { success: false, error: 'Invalid SCORM package: imsmanifest.xml not found.' };
    }

    const manifestBuffer = await manifestFile.buffer();
    const manifestXml = manifestBuffer.toString('utf8');
    const startHrefMatch = manifestXml.match(/href="([^"]+\.html?)"/i);
    const indexFile = startHrefMatch ? startHrefMatch[1] : 'index.html';

    // Upload the raw package to the secure SCORM storage bucket
    const filePath = `${workspaceId}/${lessonId}/${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('scorm_packages')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const scormBlock = {
      type: 'scorm',
      file_path: uploadData.path,
      index_file: indexFile,
      status: 'processed'
    };

    const { data: currentLesson } = await supabase.from('lessons').select('content_blocks').eq('id', lessonId).single();
    const existingBlocks = currentLesson?.content_blocks || [];

    const { data: lesson, error: dbError } = await supabase
      .from('lessons')
      .update({ content_blocks: [...existingBlocks, scormBlock] })
      .eq('id', lessonId)
      .select()
      .single();

    if (dbError) throw dbError;
    return { success: true, data: lesson };
  } catch (error: any) {
    logger.error({ err: error, lessonId }, 'lms.lessons.scorm_upload_failed');
    return { success: false, error: 'Failed to process SCORM package.' };
  }
}

// --- 2. Flashcard Builder Engine ---
export async function createFlashcardDeck(lessonId: string, cards: Array<{ front: string, back: string }>) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const flashcardBlock = {
      type: 'flashcards',
      cards: cards
    };

    const { data: currentLesson } = await supabase.from('lessons').select('content_blocks').eq('id', lessonId).single();
    const existingBlocks = currentLesson?.content_blocks || [];

    const { data: lesson, error: dbError } = await supabase
      .from('lessons')
      .update({ content_blocks: [...existingBlocks, flashcardBlock] })
      .eq('id', lessonId)
      .select()
      .single();

    if (dbError) throw dbError;
    return { success: true, data: lesson };
  } catch (error: any) {
    logger.error({ err: error, lessonId }, 'lms.lessons.flashcard_failed');
    return { success: false, error: 'Failed to save flashcards.' };
  }
}
