export type ConceptCodeRule = {
  code: string;
  concept: string;
  liquidationType: string | null;
  isAmendment: boolean | null;
  requiresConfirmation: boolean;
};

/**
 * El codificador queda centralizado para que un contador pueda corregirlo sin
 * tocar el motor. Los códigos informados con más de un significado no se
 * resuelven automáticamente.
 */
export const CONCEPT_CODE_RULES: ConceptCodeRule[] = [
  {
    code: "1",
    concept: "SUELDO",
    liquidationType: null,
    isAmendment: false,
    requiresConfirmation: false,
  },
  {
    code: "2",
    concept: "AGUINALDO",
    liquidationType: null,
    isAmendment: false,
    requiresConfirmation: false,
  },
  {
    code: "5",
    concept: "LICENCIA_NO_GOZADA",
    liquidationType: null,
    isAmendment: false,
    requiresConfirmation: false,
  },
  {
    code: "41",
    concept: "SALARIO_VACACIONAL",
    liquidationType: null,
    isAmendment: false,
    requiresConfirmation: true,
  },
  {
    code: "41",
    concept: "RETROACTIVO_AGUINALDO",
    liquidationType: null,
    isAmendment: true,
    requiresConfirmation: true,
  },
  {
    code: "3",
    concept: "SUELDO",
    liquidationType: null,
    isAmendment: true,
    requiresConfirmation: true,
  },
  {
    code: "43",
    concept: "RETROACTIVIDAD_SALARIO_VACACIONAL",
    liquidationType: null,
    isAmendment: true,
    requiresConfirmation: false,
  },
  {
    code: "6",
    concept: "RETROACTIVIDAD_LICENCIA_NO_GOZADA",
    liquidationType: null,
    isAmendment: true,
    requiresConfirmation: false,
  },
];

export function findConceptRules(
  code: string | null,
  isAmendment: boolean | null,
) {
  if (!code) return [];
  return CONCEPT_CODE_RULES.filter(
    (rule) =>
      rule.code === code &&
      (rule.isAmendment === null || rule.isAmendment === isAmendment),
  );
}
