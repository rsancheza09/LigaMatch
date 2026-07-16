/**
 * @group unit
 */
import {
  normalizeBirthDate,
  normalizeConfidence,
  normalizeDocumentDetected,
  normalizeExtractedFields,
  normalizeGuardianRelation,
  normalizeIdDocumentType,
  stripDataUrlPrefix,
} from './documentExtractionService';

describe('documentExtractionService normalizers', () => {
  describe('stripDataUrlPrefix', () => {
    it('strips data URL prefix', () => {
      expect(stripDataUrlPrefix('data:image/jpeg;base64,abc123')).toBe('abc123');
    });

    it('returns raw base64 unchanged', () => {
      expect(stripDataUrlPrefix('abc123')).toBe('abc123');
    });
  });

  describe('normalizeBirthDate', () => {
    it('accepts ISO dates', () => {
      expect(normalizeBirthDate('2010-05-15')).toBe('2010-05-15');
    });

    it('parses DMY Costa Rican style', () => {
      expect(normalizeBirthDate('15/05/2010')).toBe('2010-05-15');
      expect(normalizeBirthDate('1-3-2000')).toBe('2000-03-01');
    });

    it('rejects invalid dates', () => {
      expect(normalizeBirthDate('2010-02-30')).toBeUndefined();
      expect(normalizeBirthDate('not-a-date')).toBeUndefined();
      expect(normalizeBirthDate('')).toBeUndefined();
      expect(normalizeBirthDate(null)).toBeUndefined();
    });
  });

  describe('normalizeIdDocumentType', () => {
    it('accepts known enum values', () => {
      expect(normalizeIdDocumentType('cedula_nacional')).toBe('cedula_nacional');
      expect(normalizeIdDocumentType('pasaporte')).toBe('pasaporte');
      expect(normalizeIdDocumentType('dimex')).toBe('dimex');
    });

    it('maps free-text labels', () => {
      expect(normalizeIdDocumentType('Cédula Nacional')).toBe('cedula_nacional');
      expect(normalizeIdDocumentType('Cédula de residencia')).toBe('cedula_residencia');
      expect(normalizeIdDocumentType('Passport')).toBe('pasaporte');
      expect(normalizeIdDocumentType('Documento DIMEX')).toBe('dimex');
    });

    it('rejects unknown values', () => {
      expect(normalizeIdDocumentType('licencia')).toBeUndefined();
    });
  });

  describe('normalizeGuardianRelation', () => {
    it('accepts known values and maps synonyms', () => {
      expect(normalizeGuardianRelation('padre')).toBe('padre');
      expect(normalizeGuardianRelation('Mother')).toBe('madre');
      expect(normalizeGuardianRelation('tutor legal')).toBe('encargado');
    });
  });

  describe('normalizeDocumentDetected', () => {
    it('maps document kinds', () => {
      expect(normalizeDocumentDetected('player_id_copy')).toBe('player_id_copy');
      expect(normalizeDocumentDetected('acta de nacimiento')).toBe('birth_certificate');
      expect(normalizeDocumentDetected('cédula del padre')).toBe('guardian_id_copy');
      expect(normalizeDocumentDetected('foo')).toBe('unknown');
    });
  });

  describe('normalizeConfidence', () => {
    it('defaults to medium', () => {
      expect(normalizeConfidence('high')).toBe('high');
      expect(normalizeConfidence('nope')).toBe('medium');
    });
  });

  describe('normalizeExtractedFields', () => {
    it('normalizes a full payload', () => {
      const result = normalizeExtractedFields({
        firstName: '  Ana  María ',
        lastName: 'Jiménez  Rojas',
        birthDate: '15/05/2010',
        idDocumentType: 'Cédula Nacional',
        idDocumentNumber: '1 234 567',
        guardianName: 'Carlos Jiménez',
        guardianRelation: 'padre',
        guardianIdNumber: '1-1111-1111',
        documentDetected: 'cedula',
        confidence: 'high',
      });
      expect(result).toEqual({
        firstName: 'Ana María',
        lastName: 'Jiménez Rojas',
        birthDate: '2010-05-15',
        idDocumentType: 'cedula_nacional',
        idDocumentNumber: '1234567',
        guardianName: 'Carlos Jiménez',
        guardianRelation: 'padre',
        guardianIdNumber: '1-1111-1111',
        documentDetected: 'player_id_copy',
        confidence: 'high',
      });
    });

    it('omits empty optional fields', () => {
      const result = normalizeExtractedFields({
        firstName: '',
        lastName: null,
        birthDate: 'bad',
        confidence: 'low',
      });
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.birthDate).toBeUndefined();
      expect(result.confidence).toBe('low');
      expect(result.documentDetected).toBe('unknown');
    });
  });
});
