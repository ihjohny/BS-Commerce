'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useForm, useFormFields, useDocumentInfo, useFormInitializing } from '@payloadcms/ui'

interface ParameterOption {
  label: string | Record<string, string>
  value: string
}

interface ClassParameter {
  key: string
  label: string | Record<string, string>
  type: 'select' | 'text' | 'number' | 'boolean'
  options?: ParameterOption[]
  unit?: string
  isFilterable?: boolean
  isRequired?: boolean
  displayOrder?: number
}

interface ProductClassDoc {
  id: string
  name: string | Record<string, string>
  slug: string
  parameters?: ClassParameter[]
}

interface SpecItem {
  id?: string
  key: string
  value: string
  label?: string
  unit?: string
}

function extractClassId(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string' || typeof val === 'number') {
    const s = String(val).trim()
    return s.length > 0 ? s : null
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const id = extractClassId(item)
      if (id) return id
    }
    return null
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (obj.id) return extractClassId(obj.id)
    if (obj.value) return extractClassId(obj.value)
  }
  return null
}

function separateRows(path: string, fields: Record<string, any>) {
  const remainingFields: Record<string, any> = {}
  for (const [fieldPath, field] of Object.entries(fields || {})) {
    if (!fieldPath.startsWith(`${path}.`) && fieldPath !== path) {
      remainingFields[fieldPath] = field
    }
  }
  return { remainingFields }
}

const formatLabel = (lbl: string | Record<string, string> | undefined, fallback: string): string => {
  if (!lbl) return fallback
  if (typeof lbl === 'string') return lbl
  if (typeof lbl === 'object' && lbl !== null) {
    return lbl.en || Object.values(lbl)[0] || fallback
  }
  return fallback
}

export default function ProductSpecificationsField(props: { path?: string; label?: string }) {
  const path = props.path || 'specifications'

  // Access Payload 3 form context and document info
  const { getFields, dispatchFields, setModified, getDataByPath } = useForm()
  const { initialData } = useDocumentInfo()
  const initializing = useFormInitializing()

  // Watch productClass relationship field
  const productClassField = useFormFields(([fields]) => fields?.productClass)
  const productClassVal = productClassField?.value

  const classId = useMemo(() => {
    const fromForm = extractClassId(productClassVal)
    if (fromForm) return fromForm
    return extractClassId(initialData?.productClass)
  }, [productClassVal, initialData?.productClass])

  const [specValues, setSpecValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [classDoc, setClassDoc] = useState<ProductClassDoc | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const isInitializedRef = useRef(false)
  const prevClassIdRef = useRef<string | null>(classId)
  const rowIdsRef = useRef<Record<string, string>>({})
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 1. Hydrate initial specification values from document or form state
  useEffect(() => {
    if (initializing) return
    if (isInitializedRef.current) return

    const initialMap: Record<string, string> = {}
    const rawList =
      (getDataByPath ? (getDataByPath(path) as SpecItem[]) : undefined) ||
      (initialData?.specifications as SpecItem[]) ||
      []

    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        if (item && item.key && item.value !== undefined && item.value !== null) {
          const k = String(item.key)
          initialMap[k] = String(item.value)
          if (item.id) {
            rowIdsRef.current[k] = String(item.id)
          }
        }
      }
    }

    if (getFields) {
      const formFields = getFields() || {}
      for (const [fPath, fObj] of Object.entries(formFields)) {
        if (fPath.startsWith(`${path}.`) && fPath.endsWith('.key')) {
          const valPath = fPath.replace(/\.key$/, '.value')
          const idPath = fPath.replace(/\.key$/, '.id')
          const k = (fObj as any)?.value
          const v = (formFields[valPath] as any)?.value
          const rowId = (formFields[idPath] as any)?.value
          if (k && v !== undefined && v !== null) {
            initialMap[String(k)] = String(v)
            if (rowId) {
              rowIdsRef.current[String(k)] = String(rowId)
            }
          }
        }
      }
    }

    setSpecValues(initialMap)
    isInitializedRef.current = true
    prevClassIdRef.current = classId
  }, [initializing, initialData, path, getDataByPath, getFields, classId])

  // 2. Fetch class definition when classId changes
  useEffect(() => {
    if (!classId) {
      setClassDoc(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setFetchError(null)

    fetch(`/api/classes/${classId}?depth=1`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setClassDoc(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(`Could not load Product Class definition: ${err.message}`)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [classId])

  // 3. Synchronize specifications into Payload's Form State
  const syncToFormState = useCallback(
    (
      values: Record<string, string>,
      parameters: ClassParameter[],
      isReset = false
    ) => {
      if (!dispatchFields || !getFields) return

      const currentFields = getFields() || {}
      const { remainingFields } = separateRows(path, currentFields)
      const existingParentField = currentFields[path] || {}
      const existingCustomComponents = existingParentField.customComponents

      if (isReset || !classId || parameters.length === 0) {
        const nextState = {
          ...remainingFields,
          [path]: {
            ...existingParentField,
            disableFormData: false,
            value: [],
            initialValue: [],
            rows: [],
            valid: true,
            passesCondition: true,
            ...(existingCustomComponents ? { customComponents: existingCustomComponents } : {}),
          },
        }
        dispatchFields({
          type: 'REPLACE_STATE',
          state: nextState,
          optimize: false,
        })
        setModified(true)
        return
      }

      const activeSpecs: Array<{
        id: string
        key: string
        value: string
        label: string
        unit: string
      }> = []

      parameters.forEach((param, index) => {
        const rawVal = values[param.key]
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          const val = String(rawVal).trim()
          const rowId = rowIdsRef.current[param.key] || `${param.key}_${Date.now()}_${index}`
          rowIdsRef.current[param.key] = rowId
          activeSpecs.push({
            id: rowId,
            key: param.key,
            value: val,
            label: formatLabel(param.label, param.key),
            unit: param.unit || '',
          })
        }
      })

      const newRowsState: Record<string, any> = {}
      const rowsMeta: Array<{ id: string; isLoading: boolean }> = []

      activeSpecs.forEach((item, index) => {
        rowsMeta.push({ id: item.id, isLoading: false })
        newRowsState[`${path}.${index}.id`] = {
          initialValue: item.id,
          value: item.id,
          valid: true,
          passesCondition: true,
        }
        newRowsState[`${path}.${index}.key`] = {
          initialValue: item.key,
          value: item.key,
          valid: true,
          passesCondition: true,
        }
        newRowsState[`${path}.${index}.value`] = {
          initialValue: item.value,
          value: item.value,
          valid: true,
          passesCondition: true,
        }
        newRowsState[`${path}.${index}.label`] = {
          initialValue: item.label,
          value: item.label,
          valid: true,
          passesCondition: true,
        }
        newRowsState[`${path}.${index}.unit`] = {
          initialValue: item.unit,
          value: item.unit,
          valid: true,
          passesCondition: true,
        }
      })

      const parentField = {
        ...existingParentField,
        disableFormData: activeSpecs.length > 0,
        rows: rowsMeta,
        value: activeSpecs.length > 0 ? activeSpecs.length : [],
        initialValue: activeSpecs.length > 0 ? activeSpecs.length : [],
        valid: true,
        passesCondition: true,
        ...(existingCustomComponents ? { customComponents: existingCustomComponents } : {}),
      }

      const nextState = {
        ...remainingFields,
        [path]: parentField,
        ...newRowsState,
      }

      dispatchFields({
        type: 'REPLACE_STATE',
        state: nextState,
        optimize: false,
      })
      setModified(true)
    },
    [dispatchFields, getFields, setModified, path, classId]
  )

  // 4. Handle class changes: purge old class parameters when class changes
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (prevClassIdRef.current === classId) return

    const previous = prevClassIdRef.current
    prevClassIdRef.current = classId

    if (previous !== null) {
      // User changed to a new class or cleared class: remove old class parameter values
      setSpecValues({})
      rowIdsRef.current = {}
      syncToFormState({}, [], true)
    }
  }, [classId, syncToFormState])

  // 5. Handle value changes with instantaneous UI feedback and debounced form state sync
  const handleSpecChange = useCallback(
    (key: string, newVal: string) => {
      setSpecValues((prev) => {
        const next = { ...prev, [key]: newVal }
        if (classDoc?.parameters) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
          }
          syncTimeoutRef.current = setTimeout(() => {
            syncToFormState(next, classDoc.parameters || [])
          }, 50)
        }
        return next
      })
    },
    [classDoc?.parameters, syncToFormState]
  )

  // Clean up any pending debounced sync timeouts on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      style={{
        margin: '1.5rem 0',
        padding: '1.25rem',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: '8px',
        backgroundColor: 'var(--theme-elevation-50, #f8fafc)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h4
          style={{
            margin: '0 0 0.25rem 0',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--theme-text, #1e293b)',
          }}
        >
          Product Specifications (Class Parameters)
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--theme-elevation-500, #64748b)' }}>
          {classDoc
            ? `Inherited from Product Class: "${formatLabel(classDoc.name, classDoc.slug)}". Defined parameters automatically feed storefront filters and PDP technical specifications.`
            : 'Select a Product Class in the field above to dynamically configure standardized specifications.'}
        </p>
      </div>

      {!classId && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            backgroundColor: 'var(--theme-elevation-100, #f1f5f9)',
            border: '1px dashed var(--theme-elevation-250, #cbd5e1)',
            fontSize: '0.875rem',
            color: 'var(--theme-elevation-600, #475569)',
          }}
        >
          💡 <strong>No Product Class selected.</strong> Assign a <em>Product Class</em> above (e.g., &quot;Power Bank&quot;, &quot;Smartphone&quot;, &quot;Headphones&quot;) to automatically load and fill its specification fields.
        </div>
      )}

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Loading specification parameters...
        </div>
      )}

      {fetchError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: '6px',
            fontSize: '0.85rem',
          }}
        >
          {fetchError}
        </div>
      )}

      {classDoc && classDoc.parameters && classDoc.parameters.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {classDoc.parameters
            .slice()
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map((param) => {
              const currentVal = specValues[param.key] ?? ''
              const paramLabel = formatLabel(param.label, param.key)

              return (
                <div
                  key={param.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--theme-elevation-0, #ffffff)',
                    borderRadius: '6px',
                    border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  }}
                >
                  <label
                    htmlFor={`spec-${param.key}`}
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--theme-text, #334155)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {paramLabel}
                      {param.isRequired && (
                        <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                      )}
                    </span>
                    {param.unit && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: 'var(--theme-elevation-100, #f1f5f9)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          color: 'var(--theme-elevation-600, #64748b)',
                        }}
                      >
                        {param.unit}
                      </span>
                    )}
                  </label>

                  {param.type === 'select' ? (
                    <select
                      id={`spec-${param.key}`}
                      value={currentVal}
                      onChange={(e) => handleSpecChange(param.key, e.target.value)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.875rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        backgroundColor: 'var(--theme-input-bg, #fff)',
                        color: 'var(--theme-text, #0f172a)',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Select {paramLabel} --</option>
                      {param.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatLabel(opt.label, opt.value)}
                        </option>
                      ))}
                    </select>
                  ) : param.type === 'boolean' ? (
                    <select
                      id={`spec-${param.key}`}
                      value={currentVal}
                      onChange={(e) => handleSpecChange(param.key, e.target.value)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.875rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        backgroundColor: 'var(--theme-input-bg, #fff)',
                        color: 'var(--theme-text, #0f172a)',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Not Set --</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : param.type === 'number' ? (
                    <input
                      id={`spec-${param.key}`}
                      type="number"
                      step="any"
                      value={currentVal}
                      onChange={(e) => handleSpecChange(param.key, e.target.value)}
                      placeholder={`Enter ${paramLabel}...`}
                      style={{
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.875rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        backgroundColor: 'var(--theme-input-bg, #fff)',
                        color: 'var(--theme-text, #0f172a)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <input
                      id={`spec-${param.key}`}
                      type="text"
                      value={currentVal}
                      onChange={(e) => handleSpecChange(param.key, e.target.value)}
                      placeholder={`Enter ${paramLabel}...`}
                      style={{
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.875rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        backgroundColor: 'var(--theme-input-bg, #fff)',
                        color: 'var(--theme-text, #0f172a)',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>
              )
            })}
        </div>
      )}

      {classDoc && (!classDoc.parameters || classDoc.parameters.length === 0) && (
        <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          This Product Class does not have any parameters configured yet. You can add parameters under &quot;Classes&quot; in the admin menu.
        </div>
      )}
    </div>
  )
}
