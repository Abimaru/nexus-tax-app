# Prueba: servicios, API y eventos de integración por BP (Studio 0.7.1)

Cada fila: tipo, nombre (id), si es certificado o candidato y la señal que lo decidió. Solo páginas evaluables (OPERATIONAL o MIXED).

## BP: MCI - BP - QR Payment Transactions Reporting - Payment Transactions

Archivo: `MCI - BP - QR Payment Transactions Reporting - Payment Transactions.json`

### Página: retrieveTransactionSummary (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | QR Payment Transactions Reporting - Payment Transactions v1.0.0 (qhn9N0Pfiowl) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |

### Página: retrieveDetailedTransactions (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | QR Payment Transactions Reporting - Payment Transactions v1.0.0 (sILy1ssGSKsW) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |

### Página: retrieveBasicTransactions (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | QR Payment Transactions Reporting - Payment Transactions v1.0.0 (vILyH3suBHac) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |

## BP: MCI - BP - Virtual Account Opening - Virtual Account V2.1.0 (1)

Archivo: `MCI - BP - Virtual Account Opening - Virtual Account V2.1.0 (1).json`

### Página: initiateVirtualAccount (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Accounts (O4ovlvq3hH-k) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | SISTEMAS EXTERNOS | INVOCADO |
| API | Customer Contact Information - Contact Details v1.0.0 (v~J2e.qqw3V0) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | INTEGRACIÓN | INVOCADO |
| API | Customer Personal Data - Information v2.1.1 (v~J2GBu1SUKQ) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | INTEGRACIÓN | INVOCADO |
| API | Fraud Evaluation - Fraud Monitoring v1.0.11 (qR.uef-H~A.H) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Gestión del Fraude EPC Monitoreo y Transversales | INVOCADO |
| API | Users (8S4uPOpU_BL~) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | SISTEMAS EXTERNOS | INVOCADO |
| API | Users (8S4uWZZaSRQr) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | SISTEMAS EXTERNOS | INVOCADO |
| API | Virtual Account Opening - Virtual Account v2.1.0 (8S4uZBWnl~74) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |

### Página: initiateVirtualAccountAlias (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Fraud Evaluation - Fraud Monitoring v1.0.11 (vjk9YF-Ep1rQ) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Gestión del Fraude EPC Monitoreo y Transversales | INVOCADO |
| API | Global Accounts (Lym77jT5IH-P) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | SISTEMAS EXTERNOS | INVOCADO |
| API | Natural Person Bank Correspondence- Message Delivery (crk9ODlAXMj7) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Distribución a distancia LN Transversales a Canales | INVOCADO |
| API | Virtual Account Opening - Virtual Account v2.1.0 (Lym7MFM_bghX) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |

## BP: 76213ef1-ms_account

Archivo: `/Users/AIBARGUEN/.claude/uploads/e655cc28-98fa-4ec2-9ea8-69f14d79a684/76213ef1-ms_account.json`

### Página: ms_account-register (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Global Accounts (C62hrZioS1kI) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | Wenia | INVOCADO |
| SERVICIO | ms_account (McTH-KEq.._t) | Certificado | PRINCIPAL_POR_ESCENARIO | TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO GLOBANT ACCOUNT | PRINCIPAL |

### Página: ms_account-retrieve (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| SERVICIO | ms_account (XaTHXqXxuc.M) | Certificado | PRINCIPAL_POR_ESCENARIO | TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO GLOBANT ACCOUNT | PRINCIPAL |

## BP: MCI - BP - Credit Limit Management - Credit Limits Operation (2)

Archivo: `BlueprintEvidenceStudio_v0.3.8_Kit/Ejemplos BP /E2/MCI - BP - Credit Limit Management - Credit Limits Operation (2).json`

### Página: setCreditLimit (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Application Data- Homologation V1.0.0 (lizBNIgtmWc0) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC - Datos, Analitica, IA y Blockchain | INVOCADO |
| API | Credit Limit Management - Credit Limits Operations v1.0.0 (HezB9KD_PZ.-) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| API | Customer Commercial Data - Information - V1.1.3 (~cKzl2XSQgzL) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC - Datos, Analitica, IA y Blockchain | INVOCADO |
| API | Customer Information - Keys V2.1.0 (nKmzIbD0~bKS) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC - Datos, Analitica, IA y Blockchain | INVOCADO |
| API | Employee Keys - Information V1.1.1 (K_JzHT1hvc0w) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC - Datos, Analitica, IA y Blockchain | INVOCADO |
| Candidato API o SERVICIO | AsignacionLimitesEndeudamientoV1.0.0 (CXmzxDeWe83G) | Candidato | THIRD_SECTION_ENTIDAD_UTILIDAD_TAREA | BACK ISERIES | INVOCADO |

## BP: NMD - BP - Collections_Bill_Payments-Pay_Bill U

Archivo: `BlueprintEvidenceStudio_v0.3.8_Kit/Ejemplos BP /E1 con servicios/NMD - BP - Collections_Bill_Payments-Pay_Bill U.json`

### Página: msDebitAccountPayment (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | CollectionBillPayment - payBill 1.0.0 (wniB5n~8CzU8) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| SERVICIO | ms-depositos (wniBCQc8BggU) | Certificado | SERVICE_BY_MS_NAMING | Recaudos | INVOCADO |
| SERVICIO | ms-depositos (wniByx~NXUYm) | Certificado | SERVICE_BY_MS_NAMING | Recaudos | INVOCADO |
| SERVICIO | ms-registrar-pago (wniBxMxEmoPx) | Certificado | SERVICE_BY_MS_NAMING | Recaudos | INVOCADO |
| SERVICIO | ms-validate-payment (wniBHx_-rM2r) | Certificado | SERVICE_BY_MS_NAMING | Recaudos | INVOCADO |

## BP: Escenario2_Original

Archivo: `blueprint-evidence-studio-snapshot/Solicitud Ajustes/Escenario2_Original.json`

### Página: nombreOperacion1 (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | API PRINCIPAL (3gn9iRxfHfin) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| API | REUSO 1 API (GNveHe0Wgoi6) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | Sistema Externo | INVOCADO |
| API | REUSO 3 API (7hwehKzJcOtz) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | Federado | INVOCADO |
| Candidato API o SERVICIO | Nombre Servicio (dR7mte0G8YqS) | Candidato | UNCLASSIFIED_OUTSIDE_PRODUCER | Sistema Externo | INVOCADO |
| Candidato API o SERVICIO | REUSO 1 SERVICIO (zZ6dG0b_o-iJ) | Candidato | UNCLASSIFIED_OUTSIDE_PRODUCER | Federado | INVOCADO |
| Candidato API o SERVICIO | REUSO 2 API (vZ6dl-.ejhd2) | Candidato | UNCLASSIFIED_OUTSIDE_PRODUCER | INTEGRACIÓN | INVOCADO |
| SERVICIO | SERVICIO BACK (Hjz.eUhquqB0) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | Nombre_Cola_Request Nombre_Cola_Response | INVOCADO |

### Página: nombreOperacion2 (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Nombre Producto - Nombre API vX.0.0 (qhn9N0Pfiowl) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| Candidato API o SERVICIO | Nombre Servicio (b8xDjT2OF4IY) | Candidato | UNCLASSIFIED_OUTSIDE_PRODUCER | Sistema Externo | INVOCADO |
| Candidato EVENTO_INTEGRACION | Nombre Evento (vBtV3hoDVaWU) | Candidato | TEMPLATE_NAME_NOMBRE_EVENTO | p.nombreTopicoPublicacionv1 | INVOCADO |
| EVENTO_INTEGRACION | Nombre Evento (_AtV4K12WFw9) | Certificado | INTEGRATION_EVENT_BY_THIRD_SECTION | p.nombreTopicoPublicacionv1 s.nombreTopicoSuscripcionv1 | INVOCADO |
| SERVICIO | Nombre Servicio (b8xDf3Clr~jZ) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | DOMINIO PRODUCTOR | INVOCADO |

## BP: Copy of MCI - BP - [Debit Card Issuance] - [Management]

Archivo: `blueprint-evidence-studio-snapshot/Blueprints_ejemplos/Debit Card Issuance/Copy of MCI - BP - [Debit Card Issuance] - [Management].json`

### Página: asociatePreIssuedCardMediadoConsulta (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | (sin texto) (Mm89.RmJIaUx) | Certificado | PRINCIPAL_POR_ESCENARIO | Capa de Arquitectura - Nombre Capa de Arquitectura | PRINCIPAL |
| API | Customer Account - Accountv2.0.1 (Mm898Y9JcoRT) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| API | Customer Comercial Data - Information_3.0.1 (Mm89~cpy9s_H) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |
| API | Customer Contact - Contact Information_2.2.0 (Mm89kneGxkmx) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |
| API | Customer Personal Data - Information_3.0.1 (Mm8918Rx-oeh) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |

### Página: createCustomizedCardConsulta (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Control Regulatory Compliance Information - Control List_1.0.2 (76BtLjOhr2Gs) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC OTRAS FUNCIONES DE APOYO | INVOCADO |
| API | Customer Account - Accountv2.2.0 (AAztxo4oH3ul) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| API | Customer Comercial Data - Information_1.1.2 (AAztOn0-kSAP) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composición | INVOCADO |
| API | Customer Contact Information - Contact Details_1.0.0 (AAztva4HJ7iv) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Flujo Transaccional - no - monetario | INVOCADO |
| API | Debit Card Issuance - Management v1.0.0 (7JBtTTNLz0xz) | Certificado | PRINCIPAL_POR_ESCENARIO | Capa de Arquitectura - composición | PRINCIPAL |
| API | Deposit Account Transaction - Management_v1.1.1 (kZMJAu8P2qX5) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Depósitos y cuentas especiales | INVOCADO |
| API | Deposit Account Transaction - Transaction Management_v1.1.1 (AAztRbV3mcIL) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| EVENTO_INTEGRACION | Credit Card Statement - Retrieve Credit Card Transactions_v1.0.0 (AAztk.iHW87X) | Certificado | INTEGRATION_EVENT_BY_THIRD_SECTION | p.creditCardStatement.retrieveCreditCardTransactionsv1 s.creditCardStatement.retrieveCr... | INVOCADO |
| EVENTO_INTEGRACION | Debit Card Customized - Debit Card Failure_V1.0.0 (D.iUw4g5X.8K) | Certificado | INTEGRATION_EVENT_BY_THIRD_SECTION | p.debitCardCustomized.debitCardFailurev1 | INVOCADO |

### Página: createVirtualCard (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Control List Compliance Information - Information_1.0.1 (BbYhfC1a.V8L) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC OTRAS FUNCIONES DE APOYO | INVOCADO |
| API | Customer Account - Accountv2.2.0 (BbYhxlAtWo3R) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| API | Customer Comercial Data - Information_1.1.2 (BbYhGsgviIH-) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composición | INVOCADO |
| API | Customer Contact Information - Contact Details_1.0.0 (BbYhxluzxHJs) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Flujo Transaccional - no - monetario | INVOCADO |
| API | Debit Card Issuance - Management v1.0.0 (BbYhlc7qW3sh) | Certificado | PRINCIPAL_POR_ESCENARIO | Capa de Arquitectura - composición | PRINCIPAL |
| API | Deposit Account Transaction - Management_v1.1.1 (BbYhptNWx55b) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Depósitos y cuentas especiales | INVOCADO |
| API | Deposit Account Transaction - Transaction Management_v1.1.1 (BbYhE2pm1xhX) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| EVENTO_INTEGRACION | Debit Card Customized - Debit Card Created_v1.0.0 (BbYhG3BKFHlW) | Certificado | INTEGRATION_EVENT_BY_THIRD_SECTION | p.debitCardCustomized.debitCardCreatedv1 | INVOCADO |
| EVENTO_INTEGRACION | Debit Card Customized - Debit Card Failure_V1.0.0 (BbYhInL5HC8P) | Certificado | INTEGRATION_EVENT_BY_THIRD_SECTION | p.debitCardCustomized.debitCardFailurev1 | INVOCADO |

### Página: createVirtualCardConsulta (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | (sin texto) (X389~K7.cPem) | Certificado | PRINCIPAL_POR_ESCENARIO | Capa de Arquitectura - Nombre Capa de Arquitectura | PRINCIPAL |
| API | Customer Account - Accountv2.0.1 (X389_uKE1vbX) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DEPÓSITOS Y CUENTAS ESPECIALES | INVOCADO |
| API | Customer Comercial Data - Information_3.0.1 (X389Tu9wvlOO) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |
| API | Customer Contact - Contact Information_2.2.0 (X389u3zQYto6) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |
| API | Customer Personal Data - Information_3.0.1 (X389Gei35Hne) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | EVC DATOS, ANALITICA, IA Y BLOCKCHAIN | INVOCADO |

## BP: MCI - BP - Real Time Payments QR Keys Management - Commerce Keys (1)

Archivo: `blueprint-evidence-studio-snapshot/Blueprints_ejemplos/Real Time Payments QR Keys Management/MCI - BP - Real Time Payments QR Keys Management - Commerce Keys (1).json`

### Página: createKey (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Legal Person Bank Correspondence - Message Delivery v2.0.0 (6xA7LQq899p2) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Natural Person Bank Correspondence - Message Delivery v2.0.0 (6xA7a3XD61ON) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Real Time Payments Keys - Management v2.1.0 (ARP7l76y6.zb) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Federado | INVOCADO |
| API | Real Time Payments QR Keys Management - Commerce Keys v1.1.1 (j710rhOBP5.0) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| Candidato API o SERVICIO | recepcion_callback (5ro9dU5dDJNw) | Candidato | THIRD_SECTION_ENTIDAD_UTILIDAD_TAREA | Consumidor | INVOCADO |
| SERVICIO | ms_create_qr (yyA7O7e85MZR) | Certificado | SERVICE_BY_MS_NAMING | NUEVAS EXPERIENCIAS DE PAGO | INVOCADO |
| SERVICIO | ms_emit_callback_spi (paQ7OdE9DUFy) | Certificado | SERVICE_BY_MS_NAMING | bancolombia.psf.qr.event.spi.registerKey | INVOCADO |

### Página: updateStatusKey (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Legal Person Bank Correspondence - Message Delivery v2.0.0 (QKQ7FLYCJ3H0) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Natural Person Bank Correspondence - Message Delivery v2.0.0 (QKQ7cb9~YzfO) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Real Time Payments Keys - Management v2.1.0 (QKQ7ISEWiCY2) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Federado | INVOCADO |
| API | Real Time Payments QR Keys Management - Commerce Keys v1.1.1 (RIQ7nW-Fu.AX) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| Candidato API o SERVICIO | recepcion_callback (twG9QrdGGsgH) | Candidato | THIRD_SECTION_ENTIDAD_UTILIDAD_TAREA | Consumidor | INVOCADO |
| SERVICIO | ms_emit_callback_spi (bno9uJxzG-an) | Certificado | SERVICE_BY_MS_NAMING | bancolombia.psf.qr.event.spi.updateStateKey | INVOCADO |

### Página: updateInformationKey (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Legal Person Bank Correspondence - Message Delivery v2.0.0 (NJV7KQhfqRl2) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Natural Person Bank Correspondence - Message Delivery v2.0.0 (NJV7y6UanEkB) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Capa de Arquitectura - composicion | INVOCADO |
| API | Real Time Payments Keys - Management v2.1.0 (NJV7JcwFjwoy) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Federado | INVOCADO |
| API | Real Time Payments QR Keys Management - Commerce Keys v1.1.1 (2kV7uK_w2YrK) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| Candidato API o SERVICIO | recepcion_callback (a7G9w.6oE3YF) | Candidato | THIRD_SECTION_ENTIDAD_UTILIDAD_TAREA | Consumidor | INVOCADO |
| SERVICIO | ms_emit_callback_spi (kqo9F8sZs24i) | Certificado | SERVICE_BY_MS_NAMING | bancolombia.psf.qr.event.spi.updateKey | INVOCADO |

## BP: MCI - BP - Currency Exchange Transaction Pricing - Currency Receiving (3)

Archivo: `blueprint-evidence-studio-snapshot/Blueprints_ejemplos/Ejemplo E2/MCI - BP - Currency Exchange Transaction Pricing - Currency Receiving (3).json`

### Página: executeTransactionCurrencyExchange (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Currency Exchange Transaction Pricing - Currency Receiving v2.0.0 (tQ7mFTFbJ1SW) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| Candidato API o SERVICIO | 0235 - CI8: Calculo Compra Divisas (UaMWQdZfMkGn) | Candidato | THIRD_SECTION_ENTIDAD_UTILIDAD_TAREA | CI8_PRODUCTOCOMEX_INT.QL.REQ INT_PRODUCTOCOMEX_CI8.QL.RES | INVOCADO |
| SERVICIO | ms-transfer-service-context (QAhXAUq1OqbJ) | Certificado | SERVICE_BY_MS_NAMING | COMEX - NUBE | INVOCADO |

## BP: MCI - BP - [Investment Product Opening] - [Investment]

Archivo: `blueprint-evidence-studio-snapshot/Blueprints_ejemplos/Investment Product Opening] - [Investment/MCI - BP - [Investment Product Opening] - [Investment].json`

### Página: createProduct (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Customer Products And Services Management - RelationShip_v1.0.0 (AuOSPxLt1IlY) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | (sin texto: SIN_TIPO) | INVOCADO |
| API | Customer Regulatory Compliance Information - Control List_V1.0.2 (zVqa93t6krLl) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Otras Funciones de Apoyo | INVOCADO |
| API | Investment Product Opening - Investment v1.0.0 (AuOSOle-3nY3) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| API | Legal Person Bank Correspondence - Message Delivery_v1.1.1 (AuOSt29wAZ04) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DISTRIBUCIÓN A DISTANCIA | INVOCADO |
| API | Natural Person Bank Correspondence - Message Delivery_v1.1.1 (AuOSxug32F.r) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DISTRIBUCIÓN A DISTANCIA | INVOCADO |
| API | Payment Initiation - Credit Transfer_v1.3.0 (3IOSm2eUrnYG) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO | INVOCADO |
| API | Payment Initiation - Credit Transfer_v1.3.0 (q6qaRpfneJD3) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO | INVOCADO |
| Candidato EVENTO_INTEGRACION | Nombre Evento (Te2bW7mDmoF~) | Candidato | TEMPLATE_NAME_NOMBRE_EVENTO | p.nombreTopicoPublicacionv1 | INVOCADO |
| Candidato EVENTO_INTEGRACION | Nombre Evento (u0qa7v2UHqsl) | Candidato | TEMPLATE_NAME_NOMBRE_EVENTO | p.nombreTopicoPublicacionv1 | INVOCADO |
| SERVICIO | ms_Notificaciones (AuOS1ulorkZl) | Certificado | SERVICE_BY_MS_NAMING | Federado - PDN | INVOCADO |
| SERVICIO | ms_validación (AuOSh4AQ~34h) | Certificado | SERVICE_BY_MS_NAMING | Federado - PDN | INVOCADO |
| SERVICIO | ms_validación (ZUqak~b2qdKl) | Certificado | SERVICE_BY_MS_NAMING | Federado - PDN | INVOCADO |
| SERVICIO | Vault Core API (AuOStQKQkx--) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | Federado | INVOCADO |

### Página: Copy of createProduct (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | Customer Products And Services Management - RelationShip_v1.0.0 (Tj5j6q9p6fmS) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | (sin texto: SIN_TIPO) | INVOCADO |
| API | Customer Regulatory Compliance Information - Control List_V1.0.2 (dTvgJq8GVmJs) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC Otras Funciones de Apoyo | INVOCADO |
| API | Investment Product Opening - Investment v1.0.0 (dTvg~Jz5hugs) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| API | Legal Person Bank Correspondence - Message Delivery_v1.1.1 (Tj5jFZyE2IER) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DISTRIBUCIÓN A DISTANCIA | INVOCADO |
| API | Natural Person Bank Correspondence - Message Delivery_v1.1.1 (Tj5j2UkQGJHH) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC DISTRIBUCIÓN A DISTANCIA | INVOCADO |
| API | Payment Initiation - Credit Transfer_v1.3.0 (.54jCCrrlLMW) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO | INVOCADO |
| API | Payment Initiation - Credit Transfer_v1.3.0 (az4jvU~bkSUN) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | EVC TRANSFERENCIAS Y NUEVOS SISTEMAS DE PAGO | INVOCADO |
| Candidato API o SERVICIO | Nombre Servicio (guIhnPo29Qcb) | Candidato | UNCLASSIFIED_OUTSIDE_PRODUCER | (sin texto: SIN_TIPO) | INVOCADO |
| Candidato EVENTO_INTEGRACION | Nombre Evento (dTvgH-GLr-ZS) | Candidato | TEMPLATE_NAME_NOMBRE_EVENTO | p.nombreTopicoPublicacionv1 | INVOCADO |
| Candidato EVENTO_INTEGRACION | Nombre Evento (Oo5j0saZlZOq) | Candidato | TEMPLATE_NAME_NOMBRE_EVENTO | p.nombreTopicoPublicacionv1 | INVOCADO |
| SERVICIO | asociarProductoCliente (Mm5jkyUQWOD7) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | evaluarExcepcionesRestrictivas (._vg3AuSq.-S) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | evaluarRestriccionesCliente (z1vgxyd.QZZL) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | generarDocumento (4sIhQlfJ~35b) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | guardarResultadoSimulación (T.3jPmDPvw2H) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | ms_Notificaciones (zk5jRpV~w.m9) | Certificado | SERVICE_BY_MS_NAMING | Federado - PDN | INVOCADO |
| SERVICIO | politicasAperturaProducto (QvwgEU4PmJm3) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | realizarFirma (dxIhKjkNdfpp) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |
| SERVICIO | realizarFirma (ME4jjUmFU8nr) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | INVERSIÓN VIRTUAL | INVOCADO |

## BP: BP - BancolombiaPay Wallet Syncing - Customer

Archivo: `blueprint-evidence-studio-snapshot/Solicitud Ajustes/ResultadosBlueprint/BancolombiaPayWalletSyncing/BP - BancolombiaPay Wallet Syncing - Customer.json`

### Página: POST_Validate (MIXED)

| Tipo | Nombre (id) | Estado | Señal | Ubicación | Rol |
|---|---|---|---|---|---|
| API | BancolombiaPay Wallet Syncing Customer 1.1.0 (kH8dfMaoeZs1) | Certificado | PRINCIPAL_POR_ESCENARIO | INTEGRACIÓN | PRINCIPAL |
| API | Customer Accounts - Accounts (iUkrcYqasRWM) | Certificado | API_BY_MARKER_COUNT_IN_AUXILIAR | EVC Depósitos y cuentas especiales | INVOCADO |
| API | Customer Comercial Data - Information v1.1.3 (SSkrLLqg7vU6) | Certificado | API_BY_EXPOSURE_TYPE | Capa de Arquitectura - composicion | INVOCADO |
| API | Customer Contac Information Contact Details v1.0.1 (-Zkr0a4kHaOj) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Flujo Transaccional - no-monetario | INVOCADO |
| API | Customer Personal Data - Information (BQkru3imw4cd) | Certificado | API_BY_EMPTY_BPMN_EVENT_GROUP | Flujo Transaccional - no-monetario | INVOCADO |
| API | Second Security Factor Information - Dinamyc Key v2.1.1 (mzDu_ncjwAbP) | Certificado | API_BY_EXPOSURE_TYPE | Capa de Arquitectura - transversal | INVOCADO |
| API | SimCardActivity - Information v1.0.3 (x1krienvrtEw) | Certificado | API_BY_EXPOSURE_TYPE | Capa de Arquitectura - transversal | INVOCADO |
| API | Third Party Authentication - Management v3.1.1 (bYkr3N-NVWzR) | Certificado | API_BY_EXPOSURE_TYPE | Capa de Arquitectura - transversal | INVOCADO |
| SERVICIO | Almacenamiento Log (kH8dXX4gKc6C) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | Base de Datos BPAY (fk0fYuFTMzPr) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | Base de Datos BPAY (kH8ddm5LFamA) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | Base de Datos BPAY (kH8de.pmevdc) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | Base de Datos BPAY (oNQpJ_-l7X-R) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | Microservicio (kH8dHlEiqUPy) | Certificado | SERVICE_BY_MS_NAMING | BANCOLOMBIAPAY WALLET | INVOCADO |
| SERVICIO | session Token (kH8d0TFOePkF) | Certificado | SERVICE_BY_PRODUCER_DOMAIN | BANCOLOMBIAPAY WALLET | INVOCADO |

## Totales (todas las páginas evaluables, 11 BP)

| Tipo y estado | Figuras |
|---|---|
| Candidato API o SERVICIO | 10 |
| Candidato EVENTO_INTEGRACION | 5 |
| Certificado API | 84 |
| Certificado EVENTO_INTEGRACION | 5 |
| Certificado SERVICIO | 33 |
