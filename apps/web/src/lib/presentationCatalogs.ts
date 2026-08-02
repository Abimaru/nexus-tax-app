import type {
  AcceptedSourceStatus,
  CaseDocumentStatus,
  ConfidenceLevel,
  CoverageStatus,
  EntityCategory,
  EmployerInstanceStatus,
  ExogenousAcceptanceReason,
  FactCaptureMethod,
  FactRequirementRelation,
  FactReviewStatus,
  InformationSource,
  DocumentStorageMode,
  OccasionalGainRecognition,
  PreliminaryReconciliationStatus,
  RequirementAvailabilityStatus,
  RequirementManagementChannel,
  TaxCaseStatus,
} from '@nexus-tax/domain';

export interface PresentationEntry {
  label: string;
  description: string;
}

export const UNKNOWN_PRESENTATION: PresentationEntry = {
  label: 'Estado no reconocido',
  description:
    'La versión local no reconoce esta etiqueta. Revisa la compatibilidad del expediente.',
};

export function presentationEntry<T extends string>(
  catalog: Partial<Record<T, PresentationEntry>>,
  value: string,
): PresentationEntry {
  return catalog[value as T] ?? UNKNOWN_PRESENTATION;
}

export function missingPresentationFinding(value: string) {
  return {
    code: 'missing_presentation_label' as const,
    severity: 'info' as const,
    title: 'Falta una etiqueta de presentación',
    message: 'La interfaz encontró un estado que esta versión no reconoce.',
    technicalValue: value,
  };
}

export const REQUIREMENT_RELATION_PRESENTATION: Record<FactRequirementRelation, PresentationEntry> =
  {
    covers: {
      label: 'Cubre completamente',
      description: 'Este hecho o documento satisface el requisito.',
    },
    partially_covers: {
      label: 'Cubre parcialmente',
      description: 'Aporta una parte, pero todavía falta información.',
    },
    provides_evidence: {
      label: 'Aporta evidencia',
      description: 'Respalda el análisis, pero no cubre el requisito por sí solo.',
    },
    contradicts: {
      label: 'Contradice la información',
      description: 'Presenta un valor o una condición incompatible.',
    },
    requires_support: {
      label: 'Requiere soporte adicional',
      description: 'El dato necesita otro documento o validación.',
    },
  };

export const COVERAGE_PRESENTATION: Record<CoverageStatus, PresentationEntry> = {
  not_evaluated: { label: 'No evaluado', description: 'Todavía no se revisó la cobertura.' },
  partial: { label: 'Parcial', description: 'Existe evidencia, pero falta información.' },
  covered: { label: 'Cubierto', description: 'La evidencia satisface el requisito.' },
  not_applicable: { label: 'No aplica', description: 'El requisito no corresponde al caso.' },
  requires_review: {
    label: 'Requiere revisión',
    description: 'La cobertura necesita decisión humana.',
  },
};

export const CAPTURE_METHOD_PRESENTATION: Record<FactCaptureMethod, PresentationEntry> = {
  manual: { label: 'Registro manual', description: 'Valor digitado por una persona.' },
  automatic: { label: 'Cálculo determinista', description: 'Valor producido por una regla local.' },
  assisted: { label: 'Captura asistida', description: 'Fuente futura que siempre exige revisión.' },
  imported: { label: 'Dato importado', description: 'Valor incorporado desde otra fuente local.' },
};

export const REVIEW_STATUS_PRESENTATION: Record<FactReviewStatus, PresentationEntry> = {
  pending: { label: 'Pendiente de revisión', description: 'Aún no ha sido revisado.' },
  reviewed: { label: 'Revisado', description: 'Fue revisado por una persona.' },
  confirmed: { label: 'Confirmado', description: 'El analista confirmó el valor.' },
  rejected: { label: 'Rechazado', description: 'El valor no se usará.' },
};

export const PRELIMINARY_RECONCILIATION_PRESENTATION: Record<
  PreliminaryReconciliationStatus,
  PresentationEntry
> = {
  pending: { label: 'Pendiente', description: 'Todavía no se comparó.' },
  suggested: {
    label: 'Asociación sugerida',
    description: 'Coincidencia local pendiente de confirmar.',
  },
  reconciled: {
    label: 'Conciliado',
    description: 'La comparación fue confirmada por una persona.',
  },
  minor_difference: {
    label: 'Diferencia menor',
    description: 'La variación es pequeña y fue revisada.',
  },
  relevant_difference: {
    label: 'Diferencia relevante',
    description: 'La variación necesita revisión.',
  },
  not_comparable: {
    label: 'No comparable',
    description: 'Las fuentes no representan el mismo valor.',
  },
  other_product: {
    label: 'Otro producto',
    description: 'La evidencia corresponde a otro producto.',
  },
  exogenous_data_questioned: {
    label: 'Dato exógeno cuestionado',
    description: 'La información exógena requiere validación.',
  },
};

export const INFORMATION_SOURCE_PRESENTATION: Record<InformationSource, PresentationEntry> = {
  exogenous_information: {
    label: 'Información exógena',
    description: 'Valor reportado por terceros a la DIAN.',
  },
  document: { label: 'Documento', description: 'Valor respaldado por un soporte local.' },
  manual_entry: { label: 'Registro manual', description: 'Valor digitado por el usuario.' },
  imported_data: {
    label: 'Dato importado',
    description: 'Valor incorporado desde otro archivo local.',
  },
  deterministic_calculation: {
    label: 'Cálculo determinista',
    description: 'Resultado de una regla local versionada.',
  },
  analyst_resolution: {
    label: 'Resolución del analista',
    description: 'Decisión humana conservada con historial.',
  },
  ai_assisted_future: {
    label: 'Fuente asistida futura',
    description: 'Capacidad futura, actualmente no disponible.',
  },
};

export const ACCEPTED_SOURCE_STATUS_PRESENTATION: Record<AcceptedSourceStatus, PresentationEntry> =
  {
    pending_review: {
      label: 'Pendiente de revisión',
      description: 'La decisión necesita validación adicional.',
    },
    provisionally_accepted: {
      label: 'Aceptado provisionalmente',
      description: 'Puede orientar la matriz, pero no sustituye siempre el soporte.',
    },
    analyst_confirmed: {
      label: 'Confirmado por el analista',
      description: 'La decisión provisional fue confirmada.',
    },
    pending_support: {
      label: 'Pendiente de soporte',
      description: 'El valor se conserva mientras se busca evidencia.',
    },
    supported_by_document: {
      label: 'Respaldado por documento',
      description: 'Un documento posterior coincide con el valor.',
    },
    replaced_by_document: {
      label: 'Reemplazado por documento',
      description: 'El documento pasa a ser la fuente principal.',
    },
    contradicted_by_document: {
      label: 'Contradicho por documento',
      description: 'Un documento posterior presenta un valor distinto.',
    },
    not_comparable: {
      label: 'No comparable',
      description: 'Las fuentes representan conceptos distintos.',
    },
    rejected: { label: 'Rechazado', description: 'El analista decidió no utilizar el valor.' },
    excluded_justified: {
      label: 'Excluido con justificación',
      description: 'Se excluyó conservando la explicación.',
    },
  };

export const ACCEPTANCE_REASON_PRESENTATION: Record<ExogenousAcceptanceReason, PresentationEntry> =
  {
    entity_does_not_issue_certificate: {
      label: 'La entidad no expide certificado',
      description: 'Se verificó que no existe ese soporte.',
    },
    requested_without_response: {
      label: 'Se solicitó y no hubo respuesta',
      description: 'La gestión no obtuvo respuesta.',
    },
    document_unavailable: {
      label: 'El documento no está disponible',
      description: 'No fue posible obtenerlo por ahora.',
    },
    document_lost: {
      label: 'El documento se perdió',
      description: 'El soporte existía, pero no está disponible.',
    },
    validated_by_holder: {
      label: 'El titular validó el valor',
      description: 'La persona reconoce el valor reportado.',
    },
    other: { label: 'Otro motivo', description: 'Requiere una observación explicativa.' },
  };

export const OCCASIONAL_GAIN_PRESENTATION: Record<OccasionalGainRecognition, PresentationEntry> = {
  own_prize: {
    label: 'Corresponde a un premio propio',
    description: 'Se reconoce la operación como propia.',
  },
  collected_for_third_party: {
    label: 'Fue cobrado para un tercero',
    description: 'Se conserva y requiere explicación y revisión.',
  },
  unrecognized: {
    label: 'No se reconoce',
    description: 'No se excluye automáticamente; genera revisión.',
  },
  requires_review: {
    label: 'Requiere revisión',
    description: 'No hay información suficiente para decidir.',
  },
};

export const MANAGEMENT_CHANNEL_PRESENTATION: Record<
  RequirementManagementChannel,
  PresentationEntry
> = {
  email: { label: 'Correo electrónico', description: 'Gestión realizada por correo.' },
  phone: { label: 'Llamada', description: 'Gestión realizada por teléfono.' },
  portal: { label: 'Portal de la entidad', description: 'Gestión realizada en el portal.' },
  in_person: { label: 'Presencial', description: 'Gestión realizada presencialmente.' },
  not_attempted: { label: 'No se realizó gestión', description: 'Aún no se solicitó el soporte.' },
  other: { label: 'Otro canal', description: 'Describe el canal en la observación.' },
};

export const REQUIREMENT_AVAILABILITY_PRESENTATION: Record<
  RequirementAvailabilityStatus,
  PresentationEntry
> = {
  alternative_source_covered: {
    label: 'Cubierto por fuente alternativa',
    description: 'Otra evidencia permite cerrar el pendiente ordinario.',
  },
  pending_support: {
    label: 'Pendiente de soporte',
    description: 'El requisito sigue relevante y se buscará evidencia.',
  },
  requires_review: {
    label: 'Requiere revisión',
    description: 'La situación necesita una decisión adicional.',
  },
  justified_unavailable: {
    label: 'No disponible justificado',
    description: 'La ausencia quedó explicada y trazada.',
  },
};

export const DOCUMENT_STATUS_PRESENTATION: Record<CaseDocumentStatus, PresentationEntry> = {
  active: { label: 'Activo', description: 'Documento disponible en el expediente.' },
  obsolete: { label: 'Obsoleto', description: 'Ya no debe usarse como soporte vigente.' },
  replaced: { label: 'Reemplazado', description: 'Existe una versión posterior.' },
  error: {
    label: 'Con error',
    description: 'No fue posible registrar correctamente el documento.',
  },
};

export const DOCUMENT_STORAGE_PRESENTATION: Record<DocumentStorageMode, PresentationEntry> = {
  metadata_only: { label: 'Solo metadatos', description: 'No conserva los bytes del archivo.' },
  store_locally: { label: 'Archivo local', description: 'Conserva los bytes en este navegador.' },
  do_not_keep: {
    label: 'No conservado',
    description: 'El archivo no se guarda después de registrarlo.',
  },
};

export const EMPLOYER_STATUS_PRESENTATION: Record<EmployerInstanceStatus, PresentationEntry> = {
  pending: { label: 'Pendiente', description: 'Falta revisar el soporte laboral.' },
  partially_covered: { label: 'Parcialmente cubierto', description: 'Existe evidencia parcial.' },
  covered: { label: 'Cubierto', description: 'La instancia cuenta con soporte suficiente.' },
  not_applicable: { label: 'No aplica', description: 'La instancia no corresponde al caso.' },
  requires_review: {
    label: 'Requiere revisión',
    description: 'Hay una inconsistencia por resolver.',
  },
};

export const ENTITY_CATEGORY_PRESENTATION: Record<EntityCategory, PresentationEntry> = {
  employer: { label: 'Empleador', description: 'Entidad que reporta ingresos laborales.' },
  bank: { label: 'Entidad financiera', description: 'Banco o establecimiento financiero.' },
  pension: {
    label: 'Fondo de pensiones o cesantías',
    description: 'Entidad administradora de aportes.',
  },
  housing: {
    label: 'Entidad de vivienda',
    description: 'Entidad asociada con vivienda o financiación.',
  },
  other: { label: 'Otra entidad', description: 'Entidad de otra categoría.' },
  unknown: {
    label: 'Entidad por clasificar',
    description: 'La categoría todavía no fue determinada.',
  },
};

export const CASE_STATUS_PRESENTATION: Record<TaxCaseStatus, PresentationEntry> = {
  new: { label: 'Nuevo', description: 'Expediente recién creado.' },
  collecting_documents: {
    label: 'Recopilando documentos',
    description: 'Se están organizando soportes.',
  },
  under_analysis: { label: 'En análisis', description: 'La información está en revisión.' },
  pending_information: {
    label: 'Pendiente de información',
    description: 'Faltan datos para continuar.',
  },
  ready_for_review: {
    label: 'Listo para revisión',
    description: 'Preparado para revisión humana final.',
  },
  closed: { label: 'Cerrado', description: 'El expediente fue cerrado localmente.' },
};

export const CONFIDENCE_PRESENTATION: Record<ConfidenceLevel, PresentationEntry> = {
  high: { label: 'Alta', description: 'La evidencia coincide de forma sólida.' },
  medium: { label: 'Media', description: 'Existe evidencia útil con alguna incertidumbre.' },
  low: { label: 'Baja', description: 'Requiere validación adicional.' },
};
