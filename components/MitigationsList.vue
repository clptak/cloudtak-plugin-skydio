<template>
    <div>
        <div
            v-for='(entry, index) in model'
            :key='index'
            class='d-flex align-items-start gap-2 mb-2'
        >
            <span class='text-muted pt-2 flex-shrink-0'>
                {{ index + 1 }}
            </span>
            <TablerInput
                v-model='model[index]'
                class='flex-grow-1'
                :placeholder='`${itemLabel} ${index + 1}`'
            />
            <button
                type='button'
                class='btn btn-outline-danger flex-shrink-0'
                :aria-label='`Remove ${itemLabel.toLowerCase()} ${index + 1}`'
                @click='remove(index)'
            >
                <IconX
                    :size='16'
                    stroke='1.5'
                />
            </button>
        </div>

        <button
            type='button'
            class='btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1'
            :disabled='model.length >= max'
            @click='add'
        >
            <IconPlus
                :size='16'
                stroke='1.5'
            />
            Add
        </button>

        <div
            v-if='model.length >= max'
            class='form-hint mt-2 mb-0'
        >
            {{ maxHint || `Maximum of ${max} entries.` }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { IconPlus, IconX } from '@tabler/icons-vue';
import { TablerInput } from '@tak-ps/vue-tabler';

const model = defineModel<string[]>({ required: true });

const props = withDefaults(defineProps<{
    max?: number;
    itemLabel?: string;
    maxHint?: string;
}>(), {
    max: 10,
    itemLabel: 'Mitigation',
    maxHint: '',
});

function add(): void {
    if (model.value.length >= props.max) return;
    model.value.push('');
}

function remove(index: number): void {
    model.value.splice(index, 1);
}
</script>
