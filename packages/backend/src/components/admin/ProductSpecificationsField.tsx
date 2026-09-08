'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useForm, useFormFields, useDocumentInfo, useFormInitializing } from '@payloadcms/ui'

interface AttributeOption {
  id?: string
  label: string | Record<string, string>
  value: string
  hexColor?: string
}

interface AttributeDoc {
  id: string
  label: string | Record<string, string>
  key: string
  slug: string
  dataType: 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color'
  category?: string
  unit?: string
  defaultGroup?: string
  options?: AttributeOption[]
  isFilterable?: boolean
  isComparable?: boolean
}

interface ClassGroupAttribute {
  id?: string
  attribute: AttributeDoc | string
  isRequired?: boolean
  displayOrder?: number
  helpText?: string | Record<string, string>
}

interface ClassGroup {
  id?: string
  name: string | Record<string, string>
  displayOrder?: number
  attributes?: ClassGroupAttribute[]
}

interface ProductClassDoc {
  id: string
  name: string | Record<string, string>
  slug: string
  icon?: string
  groups?: ClassGroup[]
  parameters?: Array<{
    key: string
    label: string | Record<string, string>
    type: string
    options?: Array<{ label: string | Record<string, string>; value: string }>
    unit?: string
    isRequired?: boolean
    displayOrder?: number
  }>
}

interface SpecItem {
  id?: string
  attribute?: string | AttributeDoc | null
  key: string
  label?: string
  value: string
  values?: string[]
  unit?: string
  group?: string
  isCustom?: boolean
  isAdHoc?: boolean
  displayOrder?: number
}

function extractId(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string' || typeof val === 'number') {
    const s = String(val).trim()
    return s.length > 0 ? s : null
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const id = extractId(item)
      if (id) return id
    }
    return null
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (obj.id) return extractId(obj.id)
    if (obj.value) return extractId(obj.value)
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

  const { getFields, dispatchFields, setModified, getDataByPath } = useForm()
  const { initialData } = useDocumentInfo()
  const initializing = useFormInitializing()

  const productClassField = useFormFields(([fields]) => fields?.productClass)
  const productClassVal = productClassField?.value

  const classId = useMemo(() => {
    const fromForm = extractId(productClassVal)
    if (fromForm) return fromForm
    return extractId(initialData?.productClass)
  }, [productClassVal, initialData?.productClass])

  const [specsMap, setSpecsMap] = useState<Record<string, SpecItem>>({})
  const [loading, setLoading] = useState(false)
  const [classDoc, setClassDoc] = useState<ProductClassDoc | null>(null)
  const [allGlobalAttributes, setAllGlobalAttributes] = useState<AttributeDoc[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedAdHocAttrId, setSelectedAdHocAttrId] = useState<string>('')
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customKey, setCustomKey] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const [customGroup, setCustomGroup] = useState('Additional Specifications')

  const isInitializedRef = useRef(false)
  const prevClassIdRef = useRef<string | null>(classId)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initializing) return
    if (isInitializedRef.current) return

    const initialMap: Record<string, SpecItem> = {}
    const rawList =
      (getDataByPath ? (getDataByPath(path) as SpecItem[]) : undefined) ||
      (initialData?.specifications as SpecItem[]) ||
      []

    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        if (item && item.key) {
          const k = String(item.key)
          initialMap[k] = {
            id: item.id || `spec_${k}_${Date.now()}`,
            attribute: item.attribute ? extractId(item.attribute) : null,
            key: k,
            label: item.label || k,
            value: item.value !== undefined && item.value !== null ? String(item.value) : '',
            unit: item.unit || '',
            group: item.group || '',
            isCustom: Boolean(item.isCustom),
            isAdHoc: Boolean(item.isAdHoc),
            displayOrder: Number(item.displayOrder) || 0,
          }
        }
      }
    }

    setSpecsMap(initialMap)
    isInitializedRef.current = true
    prevClassIdRef.current = classId
  }, [initializing, initialData, path, getDataByPath, classId])

  useEffect(() => {
    fetch('/api/attributes?limit=200&depth=1')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (Array.isArray(data?.docs)) {
          setAllGlobalAttributes(data.docs)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!classId) {
      setClassDoc(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setFetchError(null)

    fetch(`/api/classes/${classId}?depth=2`)
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

  const templateAttributesMap = useMemo(() => {
    const map = new Map<string, { attr: AttributeDoc; groupName: string; isRequired: boolean }>()

    if (classDoc && Array.isArray(classDoc.groups)) {
      for (const group of classDoc.groups) {
        const groupName = formatLabel(group.name, 'General')
        if (Array.isArray(group.attributes)) {
          for (const item of group.attributes) {
            const a = typeof item.attribute === 'object' && item.attribute !== null ? item.attribute : null
            if (a && a.key) {
              map.set(String(a.key), {
                attr: a,
                groupName,
                isRequired: Boolean(item.isRequired),
              })
            }
          }
        }
      }
    }

    if (map.size === 0 && classDoc && Array.isArray(classDoc.parameters)) {
      for (const p of classDoc.parameters) {
        if (p && p.key) {
          map.set(String(p.key), {
            attr: {
              id: p.key,
              key: p.key,
              label: p.label,
              slug: p.key,
              dataType: (p.type as any) || 'text',
              options: p.options?.map((o) => ({ label: o.label, value: o.value })),
              unit: p.unit,
            },
            groupName: 'General',
            isRequired: Boolean(p.isRequired),
          })
        }
      }
    }

    return map
  }, [classDoc])

  const syncToFormState = useCallback(
    (currentMap: Record<string, SpecItem>) => {
      if (!dispatchFields || !getFields) return

      const currentFields = getFields() || {}
      const { remainingFields } = separateRows(path, currentFields)
      const existingParentField = currentFields[path] || {}
      const existingCustomComponents = existingParentField.customComponents

      const activeItems = Object.values(currentMap).filter(
        (item) => item && item.key && item.value !== undefined && item.value !== null && String(item.value).trim() !== ''
      )

      if (activeItems.length === 0) {
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
        dispatchFields({ type: 'REPLACE_STATE', state: nextState, optimize: false })
        setModified(true)
        return
      }

      const newRowsState: Record<string, any> = {}
      const rowsMeta: Array<{ id: string; isLoading: boolean }> = []

      activeItems.forEach((item, index) => {
        const rowId = item.id || `row_${item.key}_${index}`
        rowsMeta.push({ id: rowId, isLoading: false })

        newRowsState[`${path}.${index}.id`] = { initialValue: rowId, value: rowId, valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.attribute`] = { initialValue: item.attribute || null, value: item.attribute || null, valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.key`] = { initialValue: item.key, value: item.key, valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.label`] = { initialValue: item.label || item.key, value: item.label || item.key, valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.value`] = { initialValue: item.value, value: item.value, valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.unit`] = { initialValue: item.unit || '', value: item.unit || '', valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.group`] = { initialValue: item.group || '', value: item.group || '', valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.isCustom`] = { initialValue: Boolean(item.isCustom), value: Boolean(item.isCustom), valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.isAdHoc`] = { initialValue: Boolean(item.isAdHoc), value: Boolean(item.isAdHoc), valid: true, passesCondition: true }
        newRowsState[`${path}.${index}.displayOrder`] = { initialValue: index, value: index, valid: true, passesCondition: true }
      })

      const parentField = {
        ...existingParentField,
        disableFormData: true,
        rows: rowsMeta,
        value: activeItems.length,
        initialValue: activeItems.length,
        valid: true,
        passesCondition: true,
        ...(existingCustomComponents ? { customComponents: existingCustomComponents } : {}),
      }

      const nextState = {
        ...remainingFields,
        [path]: parentField,
        ...newRowsState,
      }

      dispatchFields({ type: 'REPLACE_STATE', state: nextState, optimize: false })
      setModified(true)
    },
    [dispatchFields, getFields, setModified, path]
  )

  const handleValueChange = useCallback(
    (key: string, value: string, meta?: Partial<SpecItem>) => {
      setSpecsMap((prev) => {
        const next = { ...prev }
        if (value === '') {
          delete next[key]
        } else {
          const existing = prev[key] || {}
          next[key] = {
            ...existing,
            key,
            value,
            label: meta?.label || existing.label || key,
            unit: meta?.unit !== undefined ? meta.unit : existing.unit,
            group: meta?.group || existing.group || '',
            attribute: meta?.attribute || existing.attribute,
            isCustom: meta?.isCustom !== undefined ? meta.isCustom : existing.isCustom,
            isAdHoc: meta?.isAdHoc !== undefined ? meta.isAdHoc : existing.isAdHoc,
          }
        }

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = setTimeout(() => {
          syncToFormState(next)
        }, 120)

        return next
      })
    },
    [syncToFormState]
  )

  const handleRemoveSpec = useCallback(
    (key: string) => {
      setSpecsMap((prev) => {
        const next = { ...prev }
        delete next[key]

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = setTimeout(() => {
          syncToFormState(next)
        }, 50)

        return next
      })
    },
    [syncToFormState]
  )

  const handleAttachGlobalAttribute = () => {
    if (!selectedAdHocAttrId) return
    const attr = allGlobalAttributes.find((a) => a.id === selectedAdHocAttrId)
    if (!attr || !attr.key) return

    const initialVal =
      attr.options && attr.options.length > 0
        ? String(attr.options[0].value)
        : attr.dataType === 'boolean'
        ? 'true'
        : ''

    handleValueChange(attr.key, initialVal || 'true', {
      attribute: attr.id,
      label: formatLabel(attr.label, attr.key),
      unit: attr.unit || '',
      group: attr.defaultGroup || 'Additional Specifications',
      isAdHoc: true,
      isCustom: false,
    })

    setSelectedAdHocAttrId('')
  }

  const handleAddCustomSpec = () => {
    const rawKey = customKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
    if (!rawKey || !customValue.trim()) return

    handleValueChange(rawKey, customValue.trim(), {
      label: customLabel.trim() || customKey.trim(),
      unit: customUnit.trim(),
      group: customGroup.trim() || 'Additional Specifications',
      isCustom: true,
      isAdHoc: false,
    })

    setCustomKey('')
    setCustomLabel('')
    setCustomValue('')
    setCustomUnit('')
    setShowCustomModal(false)
  }

  const adHocAndCustomSpecs = useMemo(() => {
    return Object.values(specsMap).filter(
      (s) => s.isCustom || s.isAdHoc || !templateAttributesMap.has(s.key)
    )
  }, [specsMap, templateAttributesMap])

  const availableGlobalAttrs = useMemo(() => {
    return allGlobalAttributes.filter(
      (a) => !templateAttributesMap.has(a.key) && !specsMap[a.key]
    )
  }, [allGlobalAttributes, templateAttributesMap, specsMap])

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
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--theme-text, #1e293b)',
            }}
          >
            Product Specifications &amp; Attributes
          </h4>
          {classDoc && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'var(--theme-primary-500, #3b82f6)',
                color: '#fff',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
              }}
            >
              Class: {formatLabel(classDoc.name, classDoc.slug)}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--theme-elevation-500, #64748b)' }}>
          {classDoc
            ? 'Fill in template parameters below or attach ad-hoc and custom attributes. Values power storefront facets and PDP specifications.'
            : 'Select a Product Class above to load standard template parameters, or attach global/custom attributes below.'}
        </p>
      </div>

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--theme-elevation-500)' }}>
          Loading template specifications...
        </div>
      )}

      {fetchError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            color: 'var(--bs-error, #dc2626)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: 'var(--bs-radius-sm, 6px)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {fetchError}
        </div>
      )}

      {classDoc && classDoc.groups && classDoc.groups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {classDoc.groups.map((group) => {
            const groupName = formatLabel(group.name, 'General')
            const attributes = group.attributes || []
            if (attributes.length === 0) return null

            return (
              <div
                key={group.id || groupName}
                style={{
                  backgroundColor: 'var(--theme-elevation-0, #ffffff)',
                  border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  borderRadius: '6px',
                  padding: '1rem',
                }}
              >
                <h5
                  style={{
                    margin: '0 0 0.85rem 0',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--theme-elevation-700, #334155)',
                    borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
                    paddingBottom: '0.4rem',
                  }}
                >
                  {groupName}
                </h5>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '0.85rem',
                  }}
                >
                  {attributes.map((item) => {
                    const attr = typeof item.attribute === 'object' && item.attribute !== null ? item.attribute : null
                    if (!attr || !attr.key) return null

                    const currentVal = specsMap[attr.key]?.value ?? ''
                    const attrLabel = formatLabel(attr.label, attr.key)
                    const unitSuffix = attr.unit || ''

                    return (
                      <div
                        key={attr.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          padding: '0.65rem',
                          borderRadius: '4px',
                          border: '1px solid var(--theme-elevation-100, #f1f5f9)',
                          backgroundColor: 'var(--theme-elevation-50, #f8fafc)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label
                            style={{
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              color: 'var(--theme-text, #334155)',
                            }}
                          >
                            {attrLabel}
                            {item.isRequired && <span style={{ color: '#ef4444', marginLeft: '0.2rem' }}>*</span>}
                          </label>
                          {unitSuffix && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                backgroundColor: 'var(--theme-elevation-150, #e2e8f0)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                              }}
                            >
                              {unitSuffix}
                            </span>
                          )}
                        </div>

                        {attr.dataType === 'select' && attr.options && attr.options.length > 0 ? (
                          <select
                            value={currentVal}
                            onChange={(e) =>
                              handleValueChange(attr.key, e.target.value, {
                                attribute: attr.id,
                                label: attrLabel,
                                unit: unitSuffix,
                                group: groupName,
                              })
                            }
                            style={{
                              padding: '0.45rem 0.6rem',
                              fontSize: '0.85rem',
                              borderRadius: '4px',
                              border: '1px solid var(--theme-elevation-250, #cbd5e1)',
                            }}
                          >
                            <option value="">— Select {attrLabel} —</option>
                            {attr.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {formatLabel(opt.label, opt.value)}
                              </option>
                            ))}
                          </select>
                        ) : attr.dataType === 'boolean' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleValueChange(attr.key, currentVal === 'true' ? '' : 'true', {
                                  attribute: attr.id,
                                  label: attrLabel,
                                  group: groupName,
                                })
                              }
                              style={{
                                flex: 1,
                                padding: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: currentVal === 'true' ? '#22c55e' : '#cbd5e1',
                                backgroundColor: currentVal === 'true' ? '#dcfce7' : '#fff',
                                color: currentVal === 'true' ? '#166534' : '#64748b',
                                cursor: 'pointer',
                              }}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleValueChange(attr.key, currentVal === 'false' ? '' : 'false', {
                                  attribute: attr.id,
                                  label: attrLabel,
                                  group: groupName,
                                })
                              }
                              style={{
                                flex: 1,
                                padding: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: currentVal === 'false' ? '#ef4444' : '#cbd5e1',
                                backgroundColor: currentVal === 'false' ? '#fee2e2' : '#fff',
                                color: currentVal === 'false' ? '#991b1b' : '#64748b',
                                cursor: 'pointer',
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <input
                            type={attr.dataType === 'number' ? 'number' : 'text'}
                            value={currentVal}
                            placeholder={`Enter ${attrLabel}...`}
                            onChange={(e) =>
                              handleValueChange(attr.key, e.target.value, {
                                attribute: attr.id,
                                label: attrLabel,
                                unit: unitSuffix,
                                group: groupName,
                              })
                            }
                            style={{
                              padding: '0.45rem 0.6rem',
                              fontSize: '0.85rem',
                              borderRadius: '4px',
                              border: '1px solid var(--theme-elevation-250, #cbd5e1)',
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div
        style={{
          marginTop: '1.25rem',
          backgroundColor: 'var(--theme-elevation-0, #ffffff)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          borderRadius: '6px',
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h5
              style={{
                margin: 0,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--theme-elevation-700, #334155)',
              }}
            >
              Ad-Hoc Global &amp; Custom Specifications
            </h5>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Add one-off custom specs or attach global attributes outside the assigned template.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                borderRadius: '4px',
                border: '1px solid var(--theme-elevation-300, #cbd5e1)',
                backgroundColor: 'var(--theme-elevation-50, #f8fafc)',
                color: 'var(--theme-text, #334155)',
                cursor: 'pointer',
              }}
            >
              + Add Custom Spec
            </button>
          </div>
        </div>

        {availableGlobalAttrs.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.5rem',
              borderRadius: '4px',
              backgroundColor: 'var(--theme-elevation-50, #f8fafc)',
              border: '1px dashed var(--theme-elevation-200, #e2e8f0)',
              marginBottom: '0.85rem',
            }}
          >
            <select
              value={selectedAdHocAttrId}
              onChange={(e) => setSelectedAdHocAttrId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                fontSize: '0.825rem',
                borderRadius: '4px',
                border: '1px solid var(--theme-elevation-250, #cbd5e1)',
              }}
            >
              <option value="">— Attach Global Attribute ({availableGlobalAttrs.length} available) —</option>
              {availableGlobalAttrs.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatLabel(a.label, a.key)} ({a.dataType}{a.unit ? ` · ${a.unit}` : ''})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedAdHocAttrId}
              onClick={handleAttachGlobalAttribute}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: selectedAdHocAttrId ? 'var(--theme-primary-500, #3b82f6)' : '#94a3b8',
                color: '#fff',
                cursor: selectedAdHocAttrId ? 'pointer' : 'not-allowed',
              }}
            >
              Attach
            </button>
          </div>
        )}

        {adHocAndCustomSpecs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {adHocAndCustomSpecs.map((item) => {
              const globalDef = allGlobalAttributes.find((a) => a.key === item.key || a.id === item.attribute)

              return (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.65rem',
                    borderRadius: '4px',
                    border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                    backgroundColor: item.isCustom ? '#fffbeb' : '#f0fdf4',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: item.isCustom ? '#fef3c7' : '#dcfce7',
                          color: item.isCustom ? '#b45309' : '#15803d',
                        }}
                      >
                        {item.isCustom ? 'Custom' : 'Ad-Hoc'}
                      </span>
                      <strong style={{ fontSize: '0.825rem', color: '#1e293b' }}>
                        {item.label || item.key}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(item.key)}
                      title="Remove specification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {globalDef?.options && globalDef.options.length > 0 ? (
                    <select
                      value={item.value}
                      onChange={(e) => handleValueChange(item.key, e.target.value)}
                      style={{
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.825rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      <option value="">— Select Value —</option>
                      {globalDef.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatLabel(opt.label, opt.value)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        type="text"
                        value={item.value}
                        placeholder="Value..."
                        onChange={(e) => handleValueChange(item.key, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.5rem',
                          fontSize: '0.825rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      {item.unit && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            padding: '0.4rem',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '4px',
                          }}
                        >
                          {item.unit}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No ad-hoc or custom specifications attached.
          </p>
        )}
      </div>

      {/* ─── 3. FREEFORM CUSTOM SPECIFICATION MODAL ─────────────────────── */}
      {showCustomModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Add Custom Specification
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Label *</label>
                <input
                  type="text"
                  placeholder="e.g. Special Box Contents"
                  value={customLabel}
                  onChange={(e) => {
                    setCustomLabel(e.target.value)
                    if (!customKey) {
                      setCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))
                    }
                  }}
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Key / Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. special_box_contents"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Value *</label>
                <input
                  type="text"
                  placeholder="e.g. Includes Commemorative Coin"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Unit (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. mm, g, pcs"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Group (Section)</label>
                  <input
                    type="text"
                    placeholder="e.g. Package Contents"
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customKey.trim() || !customValue.trim()}
                  onClick={handleAddCustomSpec}
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: customKey.trim() && customValue.trim() ? '#3b82f6' : '#94a3b8',
                    color: '#fff',
                    cursor: customKey.trim() && customValue.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add Specification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
