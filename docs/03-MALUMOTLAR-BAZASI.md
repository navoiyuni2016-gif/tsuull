# 03. Ma’lumotlar modeli va infratuzilma

## 3.1. Tavsiya etilgan arxitektura
Boshlanishida **modular monolith**, mikroservis emas:
- Frontend: Next.js + TypeScript, responsive UI, komponent kutubxonasi, i18n.
- Backend: NestJS + TypeScript, versiyali REST API + OpenAPI; modul boundary, domain service, outbox events.
- DB: PostgreSQL; migrations; integer IDs yoki UUID, foreign key, unique constraints, indexes, row-scoped authorization.
- Queue: Redis + BullMQ import/export va qayta hisoblash kabi og‘ir ishlar uchun.
- Fayllar: S3-compatible object storage (mahalliy MinIO yoki tasdiqlangan provayder), hash va malware scanning.
- Auth: tashkilotning mos SSO/OIDC (mavjud bo‘lsa), aks holda xavfsiz ichki auth + MFA; servis tokenlari alohida.
- PDF/XLSX: serverda qayta ishlab bo‘lmaydigan, versiyalangan andozalar va background jobs.
- Ops: Docker Compose (dev), keyin ehtiyojga ko‘ra k8s; CI, logs, traces, monitoring.
- Keyinchalik moslashgan taqsimlash uchun ixtiyoriy Python OR-Tools worker; P0 uchun shart emas.

## 3.2. Asosiy jadvallar (logical schema)
Har bir jadvalda: `id`, `created_at`, `updated_at`, `created_by`, status/soft-delete zarur bo‘lsa, `institution_id`; audit alohida append-only.

### Identity / Reference
- `institutions(id, code, name)`
- `users(id, external_subject, email, name, active, mfa_enabled)`
- `roles`, `permissions`, `user_role_scopes(user_id, role_id, faculty_id?, department_id?, valid_from, valid_to)`
- `faculties(id, institution_id, code, name)`
- `departments(id, faculty_id, code, name)`
- `academic_years(id, name, starts_on, ends_on, state, locked_at)`
- `terms(id, academic_year_id, ordinal, starts_on, ends_on, teaching_weeks, assessment_weeks)`
- `programs(id, code, name, degree_level, mode, duration_terms, responsible_department_id)`
- `cohorts(id, program_id, admission_year, curriculum_version_id)`
- `subjects(id, code, name_uz, name_ru?, subject_type, owner_department_id, active)`
- `subject_prerequisites(subject_id, requires_subject_id)` (DAG validatsiyasi)
- `staff(id, employee_ref?, full_name, department_id, position, status)`
- `staff_employment_periods(staff_id, from, to, fte_decimal, approved_capacity_hours?, source_ref)`
- `staff_subject_competencies(staff_id, subject_id, can_lecture, teaching_language, approver_id)`
- `groups(id, cohort_id, code, student_count, mode, language, effective_term_id)`
- `group_memberships` emas, kerak bo‘lsa faqat o‘quv rejalashtirish uchun agregat count; PII minimal.
- `streams(id, subject_offering_id, type, label, term_id)`
- `stream_groups(stream_id, group_id, portion?)`

### Normativlar
- `rule_sets(id, code, version, state, scope_json, effective_from, effective_to, legal_basis, checksum, parent_rule_set_id, submitted_by, approved_by, approved_at)`
- `rule_parameters(id, rule_set_id, key, value_decimal_or_json, unit, minimum, maximum, rounding_mode, precedence, explanation)`
- `rule_formulas(id, rule_set_id, code, ast_json, result_unit, input_schema, output_schema)`
- `rule_approval_events(rule_set_id, actor_id, action, reason, at)`
- `calculation_runs(id, purpose, rule_set_id, input_hash, state, started_at, finished_at, warnings, output_hash)`
- `calculation_lineages(id, run_id, output_ref, rule_id, source_refs_json, expression_trace_json)`

### Rejalar
- `curricula(id, program_id, cohort_id, name, status, current_revision_id)`
- `curriculum_revisions(id, curriculum_id, revision_no, rule_set_id, academic_year_id, based_on_id?, status, input_hash, approved_by, approved_at, locked_at)`
- `curriculum_courses(id, revision_id, subject_id, term_id, is_elective, credits_decimal, category, subject_owner_department_id)`
- `course_hour_breakdowns(id, curriculum_course_id, activity_type, hours_decimal, rule_id, calc_run_id)`
- `subject_offerings(id, curriculum_course_id, term_id, student_count, effective_at)`
- `teaching_units(id, offering_id, activity_type, stream_id?, group_id?, number_of_units, hours_per_unit, normative_multiplier, calc_run_id)`

### Yuklamalar
- `load_items(id, revision_id, offering_id, work_type_id, teaching_unit_id?, department_id, computed_hours, rule_id, natural_key_hash)`
- `work_types(id, code, unit_basis, description, evidence_required)`
- `teacher_load_plans(id, staff_id, academic_year_id, revision_no, state, approved_at)`
- `teacher_load_assignments(id, load_item_id, staff_id, allocated_hours, share_decimal, state, locked, rationale, approved_by)`
- `workload_balances(id, department_id, academic_year_id, calc_run_id, required_hours, assigned_hours, unassigned_hours)` (materialized projection, qayta tiklanadi)
- `workload_actuals(id, assignment_id, actual_date, verified_hours, evidence_id, verifier_id, state)`

### Rejalar va hisobotlar
- `annual_plans(id, academic_year_id, owner_department_id, status, approved_by)`
- `plan_tasks(id, annual_plan_id, title, due_on, owner_id, state, completion_percent, evidence_id, parent_task_id)`
- `report_templates(id, code, version, schema_json, layout_file_id, state)`
- `report_runs(id, template_id, period_from, period_to, scope_json, snapshot_hash, state, approved_by, generated_file_id)`
- `report_items(report_run_id, indicator_code, value_decimal, source_run_ids_json)`
- `approvals(id, object_type, object_id, revision_id, step_code, actor_id, decision, reason, at)`

### Qo‘shimcha o‘quv bo‘limi modullari (ikkinchi bosqich)
- `rooms(id, building_id, code, capacity, equipment_json, available)`
- `teaching_slots(id, term_id, date_or_week_pattern, starts_at, ends_at)`
- `timetable_entries(id, curriculum_revision_id, offering_id, teaching_unit_id, staff_id, room_id, slot_id, state)`
- `timetable_conflicts(id, timetable_entry_id, conflict_type, severity, resolved_by, resolution_note)`
- `syllabi(id, subject_id, curriculum_revision_id, version, owner_department_id, file_id, status, approved_at)`
- `methodical_materials(id, subject_id, academic_year_id, material_type, file_id, status)`
- `practical_training_plans(id, program_id, term_id, practice_type, credit_value, approved_revision_id, period_from, period_to)`
- `practical_training_reports(id, plan_id, department_id, evidence_id, status, submitted_at)`
- `lesson_observations(id, term_id, staff_id, offering_id, date, checklist_json, findings, reviewer_id, status)`
- `quality_followups(id, observation_id, assigned_to, deadline, resolution_evidence_id, verified_by)`

### Integratsiya / Fayllar / Xavfsizlik
- `source_systems(id, code, trust_level, source_of_truth_fields_json)`
- `source_files(id, filename, sha256, storage_key, file_size, imported_by, encrypted, received_at)`
- `import_jobs(id, source_file_id, template_id, state, rows_total, rows_valid, rows_invalid, dry_run, mapping_version_id, result_file_id, idempotency_key)`
- `import_rows(id, job_id, sheet, row_number, raw_json, normalized_json, validation_errors_json, matched_entity_ref)`
- `import_mapping_versions(id, source_label, version, mapping_json, header_fingerprint)`
- `export_jobs(id, template_id, state, filters_json, created_by, object_key, sha256)`
- `audit_events(id, actor_id, action, entity_type, entity_id, before_hash, after_hash, diff_json_redacted, request_id, occurred_at)` (append-only)
- `outbox_events(id, aggregate, entity_id, event_type, payload_json, processed_at, attempt_count)`
- `notifications(id, recipient_id, type, payload_json, read_at, delivery_state)`

## 3.3. DB muhim invariants
1. `curriculum_revision APPROVED` bo‘lgach uning kurs/soat satrlariga UPDATE/DELETE taqiq (yangi revision).
2. Yuklama ajratilgan soatlar `required_hours`dan oshmasin (o‘zaro bo‘linadigan load line bo‘lsa kelishilgan qoidalar bilan).
3. `instructor load` self-serving update/approve bo‘lmasin.
4. `rule_set` overlapped effective period+scope bo‘yicha konflikti bloklansin.
5. `import_job` commit atomik yoki batch checkpoint + rollback report; import row hech qachon manba faylsiz bo‘lmasin.
6. `audit_event`ni oddiy backend foydalanuvchisi tahrirlay olmaydi.
7. Department/faculty ruxsatlari serverda ham filtrlangan, UI’da yashirish yetmaydi.
8. Period end/start, deadline va timezone ustunlari qayd etilgan.
9. PostgreSQL transaction, optimistic lock (`revision`/`row_version`) va unique indexlar bilan double-click/double-submit muammosi hal qilinadi.
10. `Decimal` aniqligi (masalan NUMERIC(14,4)) va birlik konvertatsiyasi yagona library.

## 3.4. Performance va saqlash
- 100 mingdan ortiq load items bo‘lsa indekslar (`year, department, staff, subject`) va hisobot projection/snapshot ishlatiladi.
- Dashboard qimmat `JOIN`larni har ochilganda hisoblamasdan tasdiqlangan projection yoki materialized view'dan oladi.
- Large recalculation `job_id`, progress %, restart/suspend, idempotency va monitoring bilan ishlaydi.
- Fayl manbalari `SHA256` hash, metadata, encryption-at-rest, backup policy, retention jadvali; o‘chirib tashlash qonuniy talablariga mos.
- DB migrations backward-compatible rollouts, daily backup + restore-drill.

## 3.5. Tavsiya etilgan monorepo
```
apps/
  web/             # Next.js, localization, role-aware screens
  api/             # NestJS, modules by domain
  worker/          # import, export, re-calculation BullMQ workers
packages/
  domain/          # pure business rules, types, decimal helpers
  api-contracts/   # OpenAPI generated clients, schemas
  ui/              # shared accessible components
  config/          # lint, tsconfig, fixtures
infra/
  compose/
  deployment/
  monitoring/
docs/
tests/
  unit/
  integration/
  e2e/
  golden/
```
**Me’yorlar** DB/versioned JSONda; **formula execution** cheklangan AST evaluator’da; hech qanday `eval`, executable Excel macro yoki erkin SQL qabul qilinmaydi.
