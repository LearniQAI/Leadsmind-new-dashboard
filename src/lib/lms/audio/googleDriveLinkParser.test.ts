import { describe, it, expect } from 'vitest';
import { extractGoogleDriveFileId } from './googleDriveLinkParser';

const ID = '1a2B3c4D5e6F7g8H9i0Jklmnop-_QR';

describe('extractGoogleDriveFileId', () => {
  it('parses /file/d/{id}/view', () => {
    expect(extractGoogleDriveFileId(`https://drive.google.com/file/d/${ID}/view`)).toBe(ID);
  });

  it('parses /file/d/{id}/edit', () => {
    expect(extractGoogleDriveFileId(`https://drive.google.com/file/d/${ID}/edit?usp=sharing`)).toBe(ID);
  });

  it('parses /file/d/{id} with no trailing segment', () => {
    expect(extractGoogleDriveFileId(`https://drive.google.com/file/d/${ID}`)).toBe(ID);
  });

  it('parses ?id={id} query links', () => {
    expect(extractGoogleDriveFileId(`https://drive.google.com/open?id=${ID}`)).toBe(ID);
    expect(extractGoogleDriveFileId(`https://drive.google.com/uc?export=download&id=${ID}`)).toBe(ID);
    expect(extractGoogleDriveFileId(`https://drive.google.com/uc?id=${ID}&export=download`)).toBe(ID);
  });

  it('accepts a bare file id with no URL', () => {
    expect(extractGoogleDriveFileId(ID)).toBe(ID);
  });

  it('rejects a non-Drive host', () => {
    expect(extractGoogleDriveFileId(`https://dropbox.com/file/d/${ID}/view`)).toBeNull();
  });

  it('rejects an unparseable string', () => {
    expect(extractGoogleDriveFileId('not a url at all')).toBeNull();
    expect(extractGoogleDriveFileId('')).toBeNull();
  });

  it('rejects a Drive link with no recognizable id', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/drive/folders/some-folder')).toBeNull();
  });

  it('accepts docs.google.com hosts too', () => {
    expect(extractGoogleDriveFileId(`https://docs.google.com/file/d/${ID}/view`)).toBe(ID);
  });
});
