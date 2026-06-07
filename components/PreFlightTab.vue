<template>
    <div class='col-12 py-3'>
        <!-- Location / Airspace / Platform -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='locationOpen = !locationOpen'
            >
                <div class='card-title'>
                    Location | Airspace | Platform
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='locationOpen' />
                </div>
            </div>
            <div
                v-if='locationOpen'
                class='card-body'
            >
                <div class='mb-3'>
                    <span class='text-muted'>Map point: </span>
                    <span>{{ form.location || 'No point selected — click a point on the map.' }}</span>
                    <button
                        type='button'
                        class='btn btn-sm btn-outline-primary ms-2'
                        :disabled='!hasMapPoint'
                        @click.stop='useMapPoint'
                    >
                        Use Map Selection
                    </button>
                </div>

                <div class='mb-3'>
                    <div class='d-flex flex-wrap gap-2'>
                        <button
                            type='button'
                            class='btn btn-sm btn-outline-primary'
                            :disabled='!hasMapPoint || detecting'
                            @click.stop='detectOverlays()'
                        >
                            Detect overlays at point
                        </button>
                        <button
                            type='button'
                            class='btn btn-sm btn-outline-secondary'
                            :disabled='!hasMapPoint || detecting'
                            @click.stop='inspectOverlays'
                        >
                            Inspect overlays at point
                        </button>
                    </div>
                    <div
                        v-if='detectNotice'
                        class='alert mt-2 mb-0'
                        :class='detectError ? "alert-danger" : "alert-success"'
                    >
                        {{ detectNotice }}
                    </div>

                    <div
                        v-if='inspectResults.length'
                        class='mt-2'
                    >
                        <div class='text-muted small mb-1'>
                            Overlay features under the point (use the stable id to fill
                            <code>lib/overlay-field-map.ts</code>):
                        </div>
                        <div
                            v-for='(hit, idx) in inspectResults'
                            :key='idx'
                            class='card card-sm mb-2'
                        >
                            <div class='card-body'>
                                <div>
                                    Stable id: <strong><code>{{ hit.stableLayerId }}</code></strong>
                                </div>
                                <div class='text-muted small'>
                                    full: <code>{{ hit.layerId }}</code> · source: {{ hit.source || '∅' }}
                                </div>
                                <ul class='mb-0 mt-1'>
                                    <li
                                        v-for='(val, key) in hit.properties'
                                        :key='key'
                                    >
                                        <code>{{ key }}</code>: {{ String(val) }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if='debugResult'
                        class='mt-2 text-muted small'
                    >
                        <div>
                            Debug — {{ debugResult.totalFeaturesAtPoint }} feature(s) rendered here.
                        </div>
                        <div>
                            Visible overlays:
                            <span v-if='!debugResult.visibleOverlays.length'>none</span>
                            <span
                                v-for='ov in debugResult.visibleOverlays'
                                :key='ov.id'
                            >
                                {{ ov.name }} (#{{ ov.id }}{{ ov.type ? ', ' + ov.type : '' }});
                            </span>
                        </div>
                        <div>
                            Rendered layers ← source:
                            <span
                                v-for='(lyr, idx) in debugResult.sampleLayers'
                                :key='idx'
                            >
                                <code>{{ lyr.layerId }}</code> ← {{ lyr.source || '∅' }};
                            </span>
                        </div>
                    </div>
                </div>

                <TablerInput
                    v-model='form.dateTime'
                    label='Date / Time'
                    type='datetime-local'
                />
                <TablerInput
                    v-model='form.activityNumber'
                    class='mt-3'
                    label='DR # (Activity #)'
                />
                <TablerInput
                    v-model='form.demaNumber'
                    class='mt-3'
                    label='DEMA (State SAR Mission #)'
                />

                <label class='form-label mt-3'>Airspace Class</label>
                <select
                    v-model='form.airspaceClass'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='cls in AIRSPACE_CLASSES'
                        :key='cls'
                        :value='cls'
                    >
                        {{ cls }}
                    </option>
                </select>

                <TablerInput
                    v-model.number='form.maxAltitudeAglFt'
                    class='mt-3'
                    type='number'
                    label='Maximum Permitted Altitude (AGL) — ft'
                />

                <label class='form-label mt-3'>LAANC Required</label>
                <select
                    v-model='form.laancRequired'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <TablerInput
                    v-model='form.laancAuthNumber'
                    class='mt-3'
                    label='LAANC Authorization #'
                />

                <TablerInput
                    v-model='form.airspaceSpecial'
                    class='mt-3'
                    label='Airspace: Special'
                />

                <label class='form-label mt-3'>Platform (drone for performance check)</label>
                <select
                    v-model='form.platform'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='platform in config.platforms'
                        :key='platform.name'
                        :value='platform.name'
                    >
                        {{ platform.name }}{{ platform.specs ? ' (specs available)' : '' }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Flight Type -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='flightTypeOpen = !flightTypeOpen'
            >
                <div class='card-title'>
                    Flight Type
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='flightTypeOpen' />
                </div>
            </div>
            <div
                v-if='flightTypeOpen'
                class='card-body'
            >
                <label class='form-label'>Flight Category</label>
                <select
                    v-model='form.flightCategory'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in FLIGHT_CATEGORIES'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Mission Type</label>
                <select
                    v-model='form.missionType'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in MISSION_TYPES'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Flight Rule</label>
                <select
                    v-model='form.flightRule'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in FLIGHT_RULES'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Land Manager / Owner</label>
                <select
                    v-model='form.landManager'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='manager in config.landManagers'
                        :key='manager'
                        :value='manager'
                    >
                        {{ manager }}
                    </option>
                </select>
                <div
                    v-if='config.landManagers.length === 0'
                    class='form-hint mt-1'
                >
                    Upload a config file to populate this list.
                </div>

                <label class='form-label mt-3'>Land Manager Permission Required</label>
                <select
                    v-model='form.landManagerPermissionRequired'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Map Source</label>
                <div class='row'>
                    <div
                        v-for='opt in MAP_SOURCES'
                        :key='opt'
                        class='col-6'
                    >
                        <label class='form-check'>
                            <input
                                v-model='form.mapSource'
                                class='form-check-input'
                                type='checkbox'
                                :value='opt'
                            >
                            <span class='form-check-label'>{{ opt }}</span>
                        </label>
                    </div>
                </div>
                <TablerInput
                    v-model='form.mapSourceOther'
                    class='mt-2'
                    label='If other, enter source(s)'
                />

                <label class='form-label mt-3'>Data Collection</label>
                <div class='row'>
                    <div
                        v-for='opt in DATA_COLLECTION'
                        :key='opt'
                        class='col-6'
                    >
                        <label class='form-check'>
                            <input
                                v-model='form.dataCollection'
                                class='form-check-input'
                                type='checkbox'
                                :value='opt'
                            >
                            <span class='form-check-label'>{{ opt }}</span>
                        </label>
                    </div>
                </div>
                <TablerInput
                    v-model='form.dataCollectionOther'
                    class='mt-2'
                    label='If other, list'
                />
            </div>
        </div>

        <!-- Weather -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='weatherOpen = !weatherOpen'
            >
                <div class='card-title'>
                    Weather
                </div>
                <div class='card-actions d-flex align-items-center gap-2'>
                    <button
                        type='button'
                        class='btn btn-sm btn-primary'
                        :disabled='!hasMapPoint || weatherLoading'
                        @click.stop='fetchWeather'
                    >
                        {{ weatherLoading ? 'Fetching…' : 'Auto-fill from NWS' }}
                    </button>
                    <CollapseChevron :open='weatherOpen' />
                </div>
            </div>
            <div
                v-if='weatherOpen'
                class='card-body'
            >
                <p class='text-muted'>
                    Select a point on the map, then auto-fill current conditions from the National
                    Weather Service. US coverage only; all fields can be edited.
                </p>

                <TablerAlert
                    v-if='weatherError'
                    :err='weatherError'
                />

                <label class='form-label'>Forecast Attached (DataSync)</label>
                <select
                    v-model='form.forecastAttached'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <TablerInput
                    v-model='form.weather.source'
                    class='mt-3'
                    label='Weather Source(s)'
                />
                <div class='row'>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.temperatureF'
                            class='mt-3'
                            type='number'
                            label='Temperature (°F)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.dewPointF'
                            class='mt-3'
                            type='number'
                            label='Dew Point (°F)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.windSpeedMph'
                            class='mt-3'
                            type='number'
                            label='Wind Speed (mph)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model='form.weather.windDirection'
                            class='mt-3'
                            label='Wind Direction'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model='form.weather.kpIndex'
                            class='mt-3'
                            label='KP Index'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.visibilityMiles'
                            class='mt-3'
                            type='number'
                            label='Visibility (mi)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.ceilingFt'
                            class='mt-3'
                            type='number'
                            label='Ceiling (ft)'
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Check -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Performance Check
                </div>
                <div class='card-actions'>
                    <span
                        class='badge'
                        :class='overallBadgeClass'
                    >
                        {{ overallBadgeLabel }}
                    </span>
                </div>
            </div>
            <div class='card-body'>
                <p
                    v-if='evaluation.metrics.length === 0'
                    class='text-muted mb-0'
                >
                    Select a platform with performance specs (from the uploaded config) to evaluate
                    the current weather.
                </p>
                <table
                    v-else
                    class='table table-sm mb-0'
                >
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Current</th>
                            <th>Limit</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='metric in evaluation.metrics'
                            :key='metric.label'
                        >
                            <td>{{ metric.label }}</td>
                            <td>{{ metric.value }}</td>
                            <td>{{ metric.limit }}</td>
                            <td>
                                <span
                                    class='badge'
                                    :class='metricBadgeClass(metric.status)'
                                >
                                    {{ metricBadgeLabel(metric.status) }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div
                    v-if='evaluation.metrics.length > 0 && !evaluation.overallPass'
                    class='alert alert-warning mt-3 mb-0'
                >
                    Current weather is outside the selected platform's specifications. Review before
                    flight. You can still generate a report.
                </div>
            </div>
        </div>

        <!-- Operational Hazards -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='hazardsOpen = !hazardsOpen'
            >
                <div class='card-title'>
                    Operational Hazards
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='hazardsOpen' />
                </div>
            </div>
            <div
                v-if='hazardsOpen'
                class='card-body d-flex flex-column gap-3'
            >
                <div class='operational-hazard-section border rounded p-3'>
                    <div class='operational-hazard-section-title mb-2'>
                        Aviation Hazards
                    </div>
                    <div class='row g-2'>
                        <div
                            v-for='option in AVIATION_HAZARD_OPTIONS'
                            :key='option.id'
                            class='col-12 col-sm-6'
                        >
                            <div class='d-flex align-items-start gap-1 hazard-option'>
                                <label class='form-check mb-0 flex-grow-1'>
                                    <input
                                        v-model='form.aviationHazardSelections'
                                        class='form-check-input'
                                        type='checkbox'
                                        :value='option.id'
                                    >
                                    <span class='form-check-label'>{{ option.label }}</span>
                                </label>
                                <button
                                    v-if='option.hint'
                                    type='button'
                                    class='btn btn-link btn-sm p-0 hazard-info flex-shrink-0'
                                    :aria-label='`More information about ${option.label}`'
                                    @click='openHazardHint(option)'
                                >
                                    <IconInfoCircle
                                        :size='14'
                                        stroke='1.5'
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                    <TablerInput
                        v-model='form.aviationHazardsOther'
                        class='mt-3 mb-0'
                        label='Other:'
                    />
                </div>

                <div class='operational-hazard-section border rounded p-3'>
                    <div class='operational-hazard-section-title mb-2'>
                        Ground-based Hazards
                    </div>
                    <div class='row g-2'>
                        <div
                            v-for='option in GROUND_HAZARD_OPTIONS'
                            :key='option.id'
                            class='col-12 col-sm-6'
                        >
                            <div class='d-flex align-items-start gap-1 hazard-option'>
                                <label class='form-check mb-0 flex-grow-1'>
                                    <input
                                        v-model='form.groundHazardSelections'
                                        class='form-check-input'
                                        type='checkbox'
                                        :value='option.id'
                                    >
                                    <span class='form-check-label'>{{ option.label }}</span>
                                </label>
                                <button
                                    v-if='option.hint'
                                    type='button'
                                    class='btn btn-link btn-sm p-0 hazard-info flex-shrink-0'
                                    :aria-label='`More information about ${option.label}`'
                                    @click='openHazardHint(option)'
                                >
                                    <IconInfoCircle
                                        :size='14'
                                        stroke='1.5'
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                    <TablerInput
                        v-model='form.groundHazardsOther'
                        class='mt-3 mb-0'
                        label='Other:'
                    />
                </div>

                <div class='operational-hazard-section border rounded p-3'>
                    <div class='operational-hazard-section-title mb-2'>
                        Crew/Operator
                    </div>
                    <div class='row g-2'>
                        <div
                            v-for='option in CREW_HAZARD_OPTIONS'
                            :key='option.id'
                            class='col-12 col-sm-6'
                        >
                            <div class='d-flex align-items-start gap-1 hazard-option'>
                                <label class='form-check mb-0 flex-grow-1'>
                                    <input
                                        v-model='form.crewHazardSelections'
                                        class='form-check-input'
                                        type='checkbox'
                                        :value='option.id'
                                    >
                                    <span class='form-check-label'>{{ option.label }}</span>
                                </label>
                                <button
                                    v-if='option.hint'
                                    type='button'
                                    class='btn btn-link btn-sm p-0 hazard-info flex-shrink-0'
                                    :aria-label='`More information about ${option.label}`'
                                    @click='openHazardHint(option)'
                                >
                                    <IconInfoCircle
                                        :size='14'
                                        stroke='1.5'
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                    <TablerInput
                        v-model='form.crewHazardsOther'
                        class='mt-3 mb-0'
                        label='Other:'
                    />
                </div>

                <div class='operational-hazard-section border rounded p-3'>
                    <div class='operational-hazard-section-title mb-2'>
                        Equipment Hazards
                    </div>
                    <div class='row g-2'>
                        <div
                            v-for='option in EQUIPMENT_HAZARD_OPTIONS'
                            :key='option.id'
                            class='col-12 col-sm-6'
                        >
                            <div class='d-flex align-items-start gap-1 hazard-option'>
                                <label class='form-check mb-0 flex-grow-1'>
                                    <input
                                        v-model='form.equipmentHazardSelections'
                                        class='form-check-input'
                                        type='checkbox'
                                        :value='option.id'
                                    >
                                    <span class='form-check-label'>{{ option.label }}</span>
                                </label>
                                <button
                                    v-if='option.hint'
                                    type='button'
                                    class='btn btn-link btn-sm p-0 hazard-info flex-shrink-0'
                                    :aria-label='`More information about ${option.label}`'
                                    @click='openHazardHint(option)'
                                >
                                    <IconInfoCircle
                                        :size='14'
                                        stroke='1.5'
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                    <TablerInput
                        v-model='form.equipmentHazardsOther'
                        class='mt-3 mb-0'
                        label='Other:'
                    />
                </div>

                <div class='operational-hazard-section border rounded p-3'>
                    <div class='operational-hazard-section-title mb-2'>
                        Mitigations
                    </div>
                    <MitigationsList
                        v-model='form.mitigations'
                        :max='PREFLIGHT_MAX_MITIGATIONS'
                    />
                </div>
            </div>
        </div>

        <div
            v-if='hazardHintOpen'
            class='modal modal-blur show d-block'
            tabindex='-1'
            role='dialog'
            aria-modal='true'
            :aria-labelledby='hazardHintTitleId'
            style='background: rgba(0, 0, 0, 0.5);'
            @click.self='closeHazardHint'
        >
            <div
                class='modal-dialog modal-dialog-centered modal-sm'
                role='document'
            >
                <div class='modal-content'>
                    <div class='modal-header'>
                        <h5
                            :id='hazardHintTitleId'
                            class='modal-title'
                        >
                            {{ hazardHintTitle }}
                        </h5>
                        <button
                            type='button'
                            class='btn-close'
                            aria-label='Close'
                            @click='closeHazardHint'
                        />
                    </div>
                    <div class='modal-body'>
                        <p class='mb-0'>
                            {{ hazardHintText }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Logistics -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='logisticsOpen = !logisticsOpen'
            >
                <div class='card-title'>
                    Logistics
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='logisticsOpen' />
                </div>
            </div>
            <div
                v-if='logisticsOpen'
                class='card-body'
            >
                <label class='form-label'>Remote Pilot(s)</label>
                <div
                    v-if='config.remotePilots.length === 0'
                    class='form-hint'
                >
                    Upload a config file to populate this list.
                </div>
                <label
                    v-for='pilot in config.remotePilots'
                    :key='pilot.id'
                    class='form-check'
                >
                    <input
                        v-model='form.remotePilots'
                        class='form-check-input'
                        type='checkbox'
                        :value='pilotLabel(pilot)'
                    >
                    <span class='form-check-label'>{{ pilotLabel(pilot) }}</span>
                </label>

                <label class='form-label mt-3 mb-2'>Additional Remote Pilot(s)</label>
                <MitigationsList
                    v-model='form.additionalRemotePilots'
                    :max='PREFLIGHT_MAX_ADDITIONAL_REMOTE_PILOTS'
                    item-label='Remote pilot'
                    max-hint='Maximum of 5 additional remote pilots.'
                />

                <label class='form-label mt-3 mb-2'>Visual Observer(s)</label>
                <MitigationsList
                    v-model='form.visualObservers'
                    :max='PREFLIGHT_MAX_VISUAL_OBSERVERS'
                    item-label='Visual observer'
                    max-hint='Maximum of 10 visual observers.'
                />

                <label class='form-label mt-3 mb-2'>Additional Crewmembers</label>
                <MitigationsList
                    v-model='form.crewMembers'
                    :max='PREFLIGHT_MAX_ADDITIONAL_CREW'
                    item-label='Crewmember'
                    max-hint='Maximum of 10 additional crewmembers.'
                />
            </div>
        </div>

        <!-- Generate -->
        <div class='card mb-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='generateOpen = !generateOpen'
            >
                <div class='card-title'>
                    Generate Report
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='generateOpen' />
                </div>
            </div>
            <div
                v-if='generateOpen'
                class='card-body'
            >
                <TablerInput
                    v-model='reportTitle'
                    label='Report Title'
                    placeholder='Pre-Flight Mission Packet'
                />
                <button
                    type='button'
                    class='btn btn-primary mt-3'
                    @click='generateReport'
                >
                    Generate Report
                </button>

                <TablerAlert
                    v-if='generateError'
                    class='mt-3'
                    :err='generateError'
                />
            </div>
        </div>

        <!-- Reports list -->
        <div class='card'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='reportsOpen = !reportsOpen'
            >
                <div class='card-title'>
                    Reports
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='reportsOpen' />
                </div>
            </div>
            <div
                v-if='reportsOpen'
                class='card-body'
            >
                <p
                    v-if='reports.length === 0'
                    class='text-muted mb-0'
                >
                    No reports yet. Fill in the form and generate one above.
                </p>
                <div
                    v-if='actionNotice'
                    class='alert mb-3'
                    :class='actionError ? "alert-danger" : "alert-success"'
                >
                    {{ actionNotice }}
                </div>
                <table
                    v-if='reports.length > 0'
                    class='table'
                >
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Created</th>
                            <th>Performance</th>
                            <th class='text-end'>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='report in reports'
                            :key='report.id'
                        >
                            <td>{{ report.title }}</td>
                            <td>{{ formatDate(report.createdAt) }}</td>
                            <td>
                                <span
                                    class='badge'
                                    :class='reportBadgeClass(report.overallPass)'
                                >
                                    {{ reportBadgeLabel(report.overallPass) }}
                                </span>
                            </td>
                            <td class='text-end'>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-primary'
                                    :disabled='attachingId === report.id'
                                    @click='attachReport(report)'
                                >
                                    {{ attachingId === report.id ? 'Attaching…' : 'Attach to Mission' }}
                                </button>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-secondary ms-2'
                                    @click='exportReport(report)'
                                >
                                    Export PDF
                                </button>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-outline-danger ms-2'
                                    @click='deleteReport(report)'
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Configuration upload (accordion) -->
        <div class='card mt-3'>
            <div
                class='card-header'
                style='cursor: pointer;'
                @click='configOpen = !configOpen'
            >
                <div class='card-title'>
                    Configuration
                </div>
                <div class='card-actions'>
                    <CollapseChevron :open='configOpen' />
                </div>
            </div>
            <div
                v-if='configOpen'
                class='card-body'
            >
                <p class='text-muted'>
                    Upload a JSON file to populate the Land Manager / Owner, Platform, and Remote
                    Pilot lists, and to supply per-platform performance specifications. Saved per
                    CloudTAK user in this browser.
                </p>
                <input
                    ref='configInput'
                    class='form-control'
                    type='file'
                    accept='.json,application/json'
                    @change='onConfigFile'
                >
                <div class='form-hint mt-1'>
                    Expected keys: <code>landManagers</code>, <code>platforms</code>
                    (with optional <code>specs</code>), <code>remotePilots</code>.
                </div>

                <div
                    v-if='configNotice'
                    class='alert mt-3'
                    :class='configError ? "alert-danger" : "alert-success"'
                >
                    {{ configNotice }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { IconInfoCircle } from '@tabler/icons-vue';
import { TablerInput, TablerAlert } from '@tak-ps/vue-tabler';
import CollapseChevron from './CollapseChevron.vue';
import MitigationsList from './MitigationsList.vue';
import type { Feature } from '../../../src/types.ts';
import {
    AVIATION_HAZARD_OPTIONS,
    CREW_HAZARD_OPTIONS,
    EQUIPMENT_HAZARD_OPTIONS,
    GROUND_HAZARD_OPTIONS,
    PREFLIGHT_MAX_MITIGATIONS,
    PREFLIGHT_MAX_ADDITIONAL_REMOTE_PILOTS,
    PREFLIGHT_MAX_VISUAL_OBSERVERS,
    PREFLIGHT_MAX_ADDITIONAL_CREW,
    EMPTY_WEATHER,
    type HazardOption,
    type PerformanceStatus,
    type PreflightConfig,
    type PreflightFormState,
    type PreflightReport,
    type RemotePilot,
} from '../types';
import {
    loadPreflightConfig,
    parsePreflightConfig,
    savePreflightConfig,
    PreflightConfigError,
} from '../storage/preflightConfig';
import {
    addPreflightReport,
    deletePreflightReport,
    loadPreflightReports,
} from '../storage/preflightReports';
import { fetchPointWeather } from '../utils/weather';
import { evaluatePerformance } from '../utils/preflightPerformance';
import {
    buildPreflightPdf,
    base64ToPdfBlob,
    downloadPdfFromBase64,
    pdfToBase64,
} from '../utils/preflightPdf';
import { attachReportToMission } from '../utils/missionAttachment';
import { useMapStore } from '../../../src/stores/map.ts';
import { OVERLAY_FIELD_MAP, type PreflightAutofillField } from '../lib/overlay-field-map.ts';
import {
    detectValues,
    inspectAtPoint,
    debugAtPoint,
    recenterTo,
    type OverlayLike,
    type RecenterMap,
    type InspectResult,
    type DetectDebug,
} from '../lib/overlay-detect.ts';

const props = defineProps<{
    activeFeature: Feature | null;
    missionGuid?: string;
    missionToken?: string;
}>();

const AIRSPACE_CLASSES = ['G', 'D', 'E', 'C', 'B'];
const YES_NO = ['Yes', 'No'];
const FLIGHT_CATEGORIES = [
    'Emergency Services',
    'Law Enforcement',
    'Training',
    'Testing',
    'Function Test / Return to Service',
];
const MISSION_TYPES = [
    'Search and Rescue',
    'Evidence Search',
    'Special Event',
    'Tactical Support',
    'Search Warrant',
    'Crime Scene',
    'Accident Scene',
    'Other',
];
const FLIGHT_RULES = [
    'FAA Part 107',
    'Certificate of Authorization (COA)',
    'Special Government Interest (SGI)',
];
const MAP_SOURCES = [
    'FAA Section (Required)',
    'CloudTAK FAA Layers (Required)',
    'Aerial Imagery',
    'Other',
];
const DATA_COLLECTION = [
    'High Resolution Photographs (Loc8)',
    'Radiometric (RDT)',
    'Photogrammetry',
    'Evidentiary Photographs / Video',
    'None',
    'Other',
];

function createForm(): PreflightFormState {
    return {
        dateTime: '',
        location: '',
        latitude: null,
        longitude: null,
        activityNumber: '',
        demaNumber: '',
        airspaceClass: '',
        maxAltitudeAglFt: null,
        laancRequired: '',
        laancAuthNumber: '',
        airspaceSpecial: '',
        flightCategory: '',
        missionType: '',
        flightRule: '',
        landManager: '',
        landManagerPermissionRequired: '',
        mapSource: [],
        mapSourceOther: '',
        platform: '',
        platformOther: '',
        dataCollection: [],
        dataCollectionOther: '',
        forecastAttached: '',
        weather: { ...EMPTY_WEATHER },
        aviationHazardSelections: [],
        aviationHazardsOther: '',
        groundHazardSelections: [],
        groundHazardsOther: '',
        crewHazardSelections: [],
        crewHazardsOther: '',
        equipmentHazardSelections: [],
        equipmentHazardsOther: '',
        mitigations: [],
        remotePilots: [],
        additionalRemotePilots: [],
        visualObservers: [],
        crewMembers: [],
    };
}

const config = reactive<PreflightConfig>(loadPreflightConfig());
const form = reactive<PreflightFormState>(createForm());
const reports = ref<PreflightReport[]>(loadPreflightReports());

const configInput = ref<HTMLInputElement | null>(null);
const configNotice = ref<string | null>(null);
const configError = ref(false);
const locationOpen = ref(true);
const configOpen = ref(false);
const flightTypeOpen = ref(false);
const weatherOpen = ref(false);
const hazardsOpen = ref(false);
const logisticsOpen = ref(false);
const generateOpen = ref(false);
const reportsOpen = ref(false);

const hazardHintOpen = ref(false);
const hazardHintTitle = ref('');
const hazardHintText = ref('');
const hazardHintTitleId = 'operational-hazard-hint-title';

function openHazardHint(option: HazardOption): void {
    hazardHintTitle.value = option.label;
    hazardHintText.value = option.hint ?? '';
    hazardHintOpen.value = true;
}

function closeHazardHint(): void {
    hazardHintOpen.value = false;
}

const weatherLoading = ref(false);
const weatherError = ref<Error | undefined>();

const reportTitle = ref('');
const generateError = ref<Error | undefined>();

const attachingId = ref<string | null>(null);
const actionNotice = ref<string | null>(null);
const actionError = ref(false);

function pilotLabel(pilot: RemotePilot): string {
    return pilot.name ? `${pilot.id} — ${pilot.name}` : pilot.id;
}

/** Find the first [lon, lat] pair in an arbitrarily nested GeoJSON coordinate array. */
function firstPosition(coords: unknown): [number, number] | null {
    if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            return [coords[0], coords[1]];
        }
        for (const child of coords) {
            const found = firstPosition(child);
            if (found) return found;
        }
    }
    return null;
}

const mapPoint = computed<{ lat: number; lon: number } | null>(() => {
    const geometry = props.activeFeature?.geometry;
    if (!geometry || !('coordinates' in geometry)) return null;
    const position = firstPosition(geometry.coordinates);
    if (!position) return null;
    return { lon: position[0], lat: position[1] };
});

const hasMapPoint = computed(() => mapPoint.value !== null);

const selectedPlatform = computed(() =>
    config.platforms.find((platform) => platform.name === form.platform));

const evaluation = computed(() =>
    evaluatePerformance(form.weather, selectedPlatform.value?.specs));

const overallBadgeLabel = computed(() => {
    if (evaluation.value.metrics.length === 0) return 'NOT EVALUATED';
    return evaluation.value.overallPass ? 'WITHIN SPECS' : 'OUTSIDE SPECS';
});

const overallBadgeClass = computed(() => {
    if (evaluation.value.metrics.length === 0) return 'bg-secondary text-white';
    return evaluation.value.overallPass ? 'bg-green text-white' : 'bg-red text-white';
});

function metricBadgeClass(status: PerformanceStatus): string {
    if (status === 'pass') return 'bg-green text-white';
    if (status === 'warn') return 'bg-yellow text-dark';
    return 'bg-red text-white';
}

function metricBadgeLabel(status: PerformanceStatus): string {
    if (status === 'pass') return 'PASS';
    if (status === 'warn') return 'WARN';
    return 'FAIL';
}

function reportBadgeLabel(pass: boolean | null): string {
    if (pass === null) return 'N/A';
    return pass ? 'WITHIN SPECS' : 'OUTSIDE SPECS';
}

function reportBadgeClass(pass: boolean | null): string {
    if (pass === null) return 'bg-secondary text-white';
    return pass ? 'bg-green text-white' : 'bg-red text-white';
}

function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function useMapPoint(): void {
    const point = mapPoint.value;
    if (!point) return;
    form.latitude = point.lat;
    form.longitude = point.lon;
    form.location = `POINT (${point.lon.toFixed(6)} ${point.lat.toFixed(6)})`;
}

// ── Overlay auto-fill ──────────────────────────────────────────────────────
// Read mapped attributes from CloudTAK overlays at the selected point and write
// them into the form. See lib/overlay-field-map.ts for the (Paul-authored) mapping.

const NUMBER_FIELDS = new Set<PreflightAutofillField>(['maxAltitudeAglFt', 'latitude', 'longitude']);

const detecting = ref(false);
const detectNotice = ref<string | null>(null);
const detectError = ref(false);
const inspectResults = ref<InspectResult[]>([]);
const debugResult = ref<DetectDebug | null>(null);

// The core store type is reached through an unofficial surface; cast through `unknown`
// to a minimal shape (same approach as SkydioPanel's MapSelectionState cast).
interface MapStoreLike {
    map?: RecenterMap;
    overlays?: OverlayLike[];
}

function mapStoreLike(): MapStoreLike {
    return useMapStore() as unknown as MapStoreLike;
}

function overlayList(): OverlayLike[] {
    return mapStoreLike().overlays ?? [];
}

async function recenterMap(lonLat: [number, number]): Promise<RecenterMap | null> {
    return recenterTo(mapStoreLike().map ?? null, lonLat);
}

function applyDetectedValue(field: PreflightAutofillField, value: string): void {
    const target = form as Record<string, unknown>;
    if (NUMBER_FIELDS.has(field)) {
        const num = Number(value);
        target[field] = Number.isFinite(num) ? num : null;
    } else {
        target[field] = value;
    }
}

async function detectOverlays(opts: { silent?: boolean } = {}): Promise<void> {
    const point = mapPoint.value;
    if (!point) return;

    if (!OVERLAY_FIELD_MAP.length) {
        if (!opts.silent) {
            detectError.value = false;
            detectNotice.value = 'No overlay → field mappings configured yet. Use '
                + '"Inspect overlays at point" to discover layer ids and attributes, then add rows '
                + 'to lib/overlay-field-map.ts.';
        }
        return;
    }

    detecting.value = true;
    detectNotice.value = null;
    detectError.value = false;
    try {
        const lonLat: [number, number] = [point.lon, point.lat];
        const map = await recenterMap(lonLat);
        if (!map) {
            detectError.value = true;
            detectNotice.value = 'Map is not available.';
            return;
        }
        const results = detectValues(map, lonLat, OVERLAY_FIELD_MAP);
        const filled: string[] = [];
        for (const result of results) {
            if (result.value != null) {
                applyDetectedValue(result.formField, result.value);
                filled.push(`${result.formField} ← ${result.value}`);
            }
        }
        if (filled.length) {
            detectNotice.value = `Auto-filled ${filled.length} field(s): ${filled.join(', ')}.`;
        } else if (!opts.silent) {
            detectNotice.value = 'No mapped overlay attributes found at this point — check the '
                + 'overlay is toggled on, or use "Inspect overlays at point" to verify ids/keys.';
        }
    } catch (err) {
        detectError.value = true;
        detectNotice.value = err instanceof Error ? err.message : 'Overlay detection failed.';
    } finally {
        detecting.value = false;
    }
}

async function inspectOverlays(): Promise<void> {
    const point = mapPoint.value;
    if (!point) return;

    detecting.value = true;
    detectNotice.value = null;
    detectError.value = false;
    inspectResults.value = [];
    debugResult.value = null;
    try {
        const lonLat: [number, number] = [point.lon, point.lat];
        const map = await recenterMap(lonLat);
        if (!map) {
            detectError.value = true;
            detectNotice.value = 'Map is not available.';
            return;
        }
        const hits = inspectAtPoint(map, lonLat);
        inspectResults.value = hits;
        if (!hits.length) {
            debugResult.value = debugAtPoint(map, overlayList(), lonLat);
            detectNotice.value = 'No overlay features matched at this point. See debug info below.';
        }
    } catch (err) {
        detectError.value = true;
        detectNotice.value = err instanceof Error ? err.message : 'Overlay inspection failed.';
    } finally {
        detecting.value = false;
    }
}

// Auto-fill whenever the selected point changes (silent: no noise if nothing matches).
watch(
    () => (mapPoint.value ? `${mapPoint.value.lon},${mapPoint.value.lat}` : null),
    (key) => {
        if (key) void detectOverlays({ silent: true });
    },
);

async function onConfigFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    configNotice.value = null;
    configError.value = false;

    try {
        const text = await file.text();
        const parsed = parsePreflightConfig(text);
        Object.assign(config, parsed);
        savePreflightConfig(parsed);
        configNotice.value = `Loaded ${parsed.landManagers.length} land manager(s), `
            + `${parsed.platforms.length} platform(s), ${parsed.remotePilots.length} pilot(s).`;
    } catch (err) {
        configError.value = true;
        configNotice.value = err instanceof PreflightConfigError || err instanceof Error
            ? err.message
            : 'Failed to read config file.';
    } finally {
        if (configInput.value) configInput.value.value = '';
    }
}

async function fetchWeather(): Promise<void> {
    const point = mapPoint.value;
    if (!point) return;

    useMapPoint();
    weatherLoading.value = true;
    weatherError.value = undefined;

    try {
        const weather = await fetchPointWeather(point.lat, point.lon);
        // Preserve any manually-entered KP index since NWS does not provide it.
        Object.assign(form.weather, weather, {
            kpIndex: weather.kpIndex || form.weather.kpIndex,
        });
        if (!form.forecastAttached) form.forecastAttached = 'Yes';
    } catch (err) {
        weatherError.value = err instanceof Error ? err : new Error('Failed to fetch weather');
    } finally {
        weatherLoading.value = false;
    }
}

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'preflight-report';
}

function generateReport(): void {
    generateError.value = undefined;

    try {
        const generatedAt = new Date().toLocaleString();
        const title = reportTitle.value.trim() || `Pre-Flight ${generatedAt}`;
        const doc = buildPreflightPdf({
            form,
            evaluation: evaluation.value,
            platformLabel: form.platform || form.platformOther || '—',
            generatedAt,
        });
        const report: PreflightReport = {
            id: crypto.randomUUID(),
            title,
            createdAt: new Date().toISOString(),
            location: form.location,
            platform: form.platform,
            overallPass: evaluation.value.metrics.length === 0 ? null : evaluation.value.overallPass,
            fileName: `${sanitizeFileName(title)}.pdf`,
            pdfBase64: pdfToBase64(doc),
        };
        reports.value = addPreflightReport(report);
    } catch (err) {
        generateError.value = err instanceof Error
            ? new Error(`Could not save report (browser storage may be full): ${err.message}`)
            : new Error('Failed to generate report');
    }
}

function exportReport(report: PreflightReport): void {
    downloadPdfFromBase64(report.pdfBase64, report.fileName);
}

async function attachReport(report: PreflightReport): Promise<void> {
    attachingId.value = report.id;
    actionNotice.value = null;
    actionError.value = false;

    try {
        const blob = base64ToPdfBlob(report.pdfBase64);
        const result = await attachReportToMission(
            props.missionGuid ?? '',
            blob,
            report.fileName,
            props.missionToken,
        );
        actionNotice.value = result.message;
        actionError.value = result.method === 'log';
    } catch (err) {
        actionError.value = true;
        actionNotice.value = err instanceof Error ? err.message : 'Failed to attach report.';
    } finally {
        attachingId.value = null;
    }
}

function deleteReport(report: PreflightReport): void {
    reports.value = deletePreflightReport(report.id);
}

onMounted(() => {
    Object.assign(config, loadPreflightConfig());
    reports.value = loadPreflightReports();
    if (!form.dateTime) {
        // Default to now in the input's local-datetime format (YYYY-MM-DDTHH:mm).
        form.dateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    }
    useMapPoint();
});
</script>

<style scoped>
.operational-hazard-section-title {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    opacity: 0.85;
}

.hazard-info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    min-width: 1.75rem;
    min-height: 1.75rem;
    margin-top: -0.125rem;
    line-height: 1;
    opacity: 0.65;
}

.hazard-info:hover,
.hazard-info:focus {
    opacity: 1;
}

.hazard-option {
    min-height: 1.5rem;
}
</style>
