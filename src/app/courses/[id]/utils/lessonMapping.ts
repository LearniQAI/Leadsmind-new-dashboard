export const mapLessonForModal = (dbLesson: any) => {
  if (!dbLesson) return null;
  const typeMap: Record<string, string> = {
    text: "Text",
    video: "Video",
    quiz: "Quiz",
    assignment: "Assignment",
    pdf: "PDF",
    audio: "Audio",
    live_session: "Live Session",
    flashcards: "Flashcards",
    code: "Code",
    scorm: "SCORM"
  };
  
  const contentObj = typeof dbLesson.content === "object" && dbLesson.content !== null ? dbLesson.content : {};
  
  return {
    ...dbLesson,
    type: typeMap[dbLesson.lesson_type] || dbLesson.type || "Text",
    is_free: dbLesson.is_preview || dbLesson.is_free,
    video_url: contentObj.video_url || dbLesson.video_url || "",
    metadata: contentObj.metadata || dbLesson.metadata || {},
    content: contentObj.text !== undefined ? contentObj.text : (typeof dbLesson.content === "string" ? dbLesson.content : "")
  };
};

export const mapLessonTypeToDb = (uiType: string): string => {
  const typeMap: Record<string, string> = {
    "Text": "text",
    "Video": "video",
    "Quiz": "quiz",
    "Assignment": "assignment",
    "PDF": "pdf",
    "Audio": "audio",
    "Live Session": "live_session",
    "Flashcards": "flashcards",
    "Code": "code",
    "SCORM": "scorm"
  };
  return typeMap[uiType] || uiType.toLowerCase();
};
