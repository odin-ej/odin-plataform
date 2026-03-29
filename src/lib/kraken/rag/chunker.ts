export interface TextChunk {
  text: string;
  index: number;
  metadata: Record<string, unknown>;
}

/**
 * Split text into overlapping chunks for embedding.
 */
export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): TextChunk[] {
  const { chunkSize = 500, overlap = 100 } = options;
  const chunks: TextChunk[] = [];

  if (!text || text.trim().length === 0) return chunks;

  // Split by paragraphs first, then combine into chunks
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        metadata: {},
      });

      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: {},
    });
  }

  // If text has no paragraphs, split by character count
  if (chunks.length === 0 && text.trim().length > 0) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push({
          text: chunk.trim(),
          index: chunkIndex++,
          metadata: {},
        });
      }
    }
  }

  return chunks;
}
