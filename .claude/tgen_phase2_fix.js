    // ── Phase 2: deps (what this uses) + callers (what uses this) in parallel ──
    const [apiDepRes, apiCallerRes] = classId ? await Promise.all([
      sfToolingQuery(`SELECT RefMetadataComponentName,RefMetadataComponentType FROM MetadataComponentDependency WHERE MetadataComponentId='${classId}' LIMIT 200`).catch(() => ({records:[]})),
      sfToolingQuery(`SELECT MetadataComponentName,MetadataComponentType FROM MetadataComponentDependency WHERE RefMetadataComponentId='${classId}' AND MetadataComponentType IN ('ApexClass','ApexTrigger') LIMIT 50`).catch(() => ({records:[]}))
    ]) : [{records:[]},{records:[]}];
