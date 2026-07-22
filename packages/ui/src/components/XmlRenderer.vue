<template>
  <NScrollbar
    v-if="!disableInternalScroll"
    style="height: 100%; max-height: 100%"
    :bordered="false"
  >
    <div class="xml-renderer xml-renderer--scrollable">
      <template v-if="parsedTree.rootNodes.length > 0 && !parsedTree.error">
        <XmlTreeNode
          v-for="(node, index) in parsedTree.rootNodes"
          :key="`xml-root:${node.kind}:${node.name || index}`"
          :node="node"
          :depth="0"
          :default-expanded-depth="1"
        />
      </template>

      <pre v-else class="xml-renderer__fallback">{{ parsedTree.source || content }}</pre>
    </div>
  </NScrollbar>

  <div
    v-else
    class="xml-renderer"
    style="height: 100%; max-height: 100%; overflow-y: auto"
  >
    <template v-if="parsedTree.rootNodes.length > 0 && !parsedTree.error">
      <XmlTreeNode
        v-for="(node, index) in parsedTree.rootNodes"
        :key="`xml-root:${node.kind}:${node.name || index}`"
        :node="node"
        :depth="0"
        :default-expanded-depth="1"
      />
    </template>

    <pre v-else class="xml-renderer__fallback">{{ parsedTree.source || content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NScrollbar } from 'naive-ui'
import XmlTreeNode from './xml/XmlTreeNode.vue'
import { parseXmlContent } from '../utils/xml-renderer'

const props = withDefaults(
  defineProps<{
    content: string
    disableInternalScroll?: boolean
  }>(),
  {
    disableInternalScroll: false,
  },
)

const parsedTree = computed(() => parseXmlContent(props.content))
</script>

<style scoped>
.xml-renderer {
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
  padding: 0.75rem;
}

.xml-renderer--scrollable {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.xml-renderer::-webkit-scrollbar {
  display: none;
}

.xml-renderer__fallback {
  margin: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: inherit;
}
</style>
