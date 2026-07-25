    // ── Phase 1: body + org list + existing test + factories (parallel) ────────
    const [bodyRes, allRes, existTestRes, factoryRes] = await Promise.all([
      sfQuery(`SELECT Id, Name, Body FROM ApexClass WHERE Name = '${name}' LIMIT 1`),
      _tgenOrgClasses.length
        ? Promise.resolve({ records: _tgenOrgClasses.map(n => ({ Name: n })) })
        : sfQuery(`SELECT Name FROM ApexClass WHERE Status = 'Active' ORDER BY Name LIMIT 2000`),
      sfQuery(`SELECT Name FROM ApexClass WHERE Name = '${name}Test' LIMIT 1`).catch(() => ({ records: [] })),
      sfQuery(`SELECT Name FROM ApexClass WHERE (Name LIKE 'TestData%' OR Name LIKE '%TestFactory%' OR Name LIKE 'TestUtil%') AND Status = 'Active' LIMIT 5`).catch(() => ({ records: [] })),
    ]);

    if (!bodyRes.records.length) { toast('Class not found', 'error'); return; }
    const body = bodyRes.records[0].Body || '';
    const classId = bodyRes.records[0].Id || '';
    _tgenOrgClasses = allRes.records.map(r => r.Name);
    _tgenSelectedClass = { name, body };

    // ── Phase 2: real dep lookup via class ID (name filter not supported by Tooling API) ──
    const apiDepRes = classId
      ? await sfToolingQuery(`SELECT RefMetadataComponentName,RefMetadataComponentType FROM MetadataComponentDependency WHERE MetadataComponentId='${classId}' LIMIT 200`).catch(() => ({ records:[] }))
      : { records: [] };

