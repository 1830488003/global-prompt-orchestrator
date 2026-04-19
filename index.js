import {
    Generate,
    chat,
    characters,
    generateRaw,
    main_api,
    name1,
    name2,
    saveSettingsDebounced,
    this_chid,
} from '../../../../script.js';
import { event_types, eventSource } from '../../../../scripts/events.js';
import { extension_settings } from '../../../../scripts/extensions.js';
import { groups, selected_group } from '../../../../scripts/group-chats.js';
import { getPresetManager } from '../../../../scripts/preset-manager.js';
import { itemizedPrompts } from '../../../../scripts/itemized-prompts.js';
import { promptManager, oai_settings } from '../../../../scripts/openai.js';
import { user_avatar } from '../../../../scripts/personas.js';
import { power_user } from '../../../../scripts/power-user.js';
import { getTokenCountAsync } from '../../../../scripts/tokenizers.js';
import { download } from '../../../../scripts/utils.js';
import { selected_world_info, world_info } from '../../../../scripts/world-info.js';

jQuery(async () => {
    const extensionName = 'third-party/global-prompt-orchestrator';
    const extensionRepoOwner = '1830488003';
    const extensionRepoName = 'global-prompt-orchestrator';
    const settingsKey = 'global_prompt_orchestrator';
    const buttonId = 'gpo-floating-button';
    const overlayId = '#gpo-popup-overlay';
    const popupId = '#gpo-popup';
    const buttonPositionStorageKey = 'global_prompt_orchestrator_button_position';
    const colorPalette = [
        ['#6cc4ff', '#2e84ff'],
        ['#17d6a3', '#0f8f79'],
        ['#f6c356', '#e58a1f'],
        ['#ff8a7a', '#ff5d66'],
        ['#a78bfa', '#6d5ef3'],
        ['#5eead4', '#159b91'],
    ];

    const defaultSettings = {
        enabled: true,
        defaultPage: 'overview',
    };

    const state = {
        popupOpen: false,
        page: 'overview',
        detailTab: 'prompt',
        previewTab: 'structure',
        refreshing: false,
        aiSuggestionLoading: false,
        aiSuggestion: null,
        aiSuggestionError: '',
        runtimeCaptureMuted: false,
        latestTextPipeline: null,
        latestOpenAiChat: null,
        latestWorldInfoScan: null,
        latestWorldInfoActivated: [],
        lastSnapshot: null,
        actionMenuOpen: false,
        subtitle: '正在等待快照',
    };

    const sourceLabelMap = new Map([
        ['chatHistory', '聊天记录'],
        ['dialogueExamples', '示例对话'],
        ['worldInfoBefore', '世界书'],
        ['worldInfoAfter', '世界书'],
        ['world', '世界书'],
        ['charDescription', '角色卡设定'],
        ['charPersonality', '角色卡性格'],
        ['scenario', '角色卡场景'],
        ['personaDescription', '你的设定'],
        ['authorsNote', '作者注释'],
        ['summary', '记忆摘要'],
        ['vectorsMemory', '向量记忆'],
        ['vectorsDataBank', '资料库向量'],
        ['smartContext', '智能上下文'],
        ['main', '主提示词'],
        ['jailbreak', '越狱提示'],
        ['nsfw', '额外限制'],
        ['bias', '回复偏好'],
        ['system', '系统提示词'],
        ['story', '上下文模板'],
        ['examples', '示例对话'],
        ['history', '聊天记录'],
        ['runtime', '附加指令'],
        ['controlPrompts', '附加指令'],
        ['quietPrompt', '静默提示'],
        ['groupNudge', '群聊引导'],
        ['continueNudge', '续写提示'],
        ['continuePrefill', '续写补全'],
        ['beforeScenarioAnchor', '作者注释（前置）'],
        ['afterScenarioAnchor', '作者注释（后置）'],
        ['naiPreamble', '预置前言'],
        ['collection', '内容块'],
    ]);

    const sourceCategoryMap = [
        { match: /chatHistory/i, label: '聊天记录' },
        { match: /worldInfo|^world$/i, label: '世界书' },
        { match: /charDescription|charPersonality|scenario/i, label: '角色卡' },
        { match: /personaDescription/i, label: '用户设定' },
        { match: /authorsNote|beforeScenarioAnchor|afterScenarioAnchor/i, label: '作者注释' },
        { match: /summary|vectorsMemory|vectorsDataBank|smartContext/i, label: '扩展注入' },
        { match: /story|context/i, label: '上下文模板' },
        { match: /dialogueExamples|examples/i, label: '示例对话' },
        { match: /main|system|jailbreak|nsfw|bias|naiPreamble/i, label: '预设与系统规则' },
        { match: /quietPrompt|controlPrompts|continueNudge|continuePrefill|groupNudge|runtime/i, label: '附加指令' },
    ];

    const pluginInstallGuide = '安装方式：点击酒馆左侧三个骰子图标，找到“安装扩展”，粘贴对应网址安装，安装后刷新页面。';
    const pluginCatalog = [
        {
            id: 'regex_manager',
            name: '自动修复格式插件 / 正则管理器',
            category: '格式修复',
            primaryUrl: 'https://github.com/1830488003/regex-manager-momo1',
            extraUrls: [],
            useHint: '安装后点消息旁边的扳手就能自动修复格式，也支持自动写正则并注入酒馆。',
            targets: ['格式', '状态栏', '正则', '输出格式', '思维链', '消息后处理', '扩展注入'],
        },
        {
            id: 'memos',
            name: '记忆插件',
            category: '聊天记忆',
            primaryUrl: 'https://github.com/1830488003/memos',
            extraUrls: [],
            useHint: '适合聊天记录太长、上下文需要长期记忆的场景。',
            targets: ['聊天上下文', '聊天记录', '记忆', '上下文压缩'],
        },
        {
            id: 'preset_manager',
            name: '预设管理器',
            category: '预设',
            primaryUrl: 'https://github.com/1830488003/preset-manager-momo.git',
            extraUrls: [],
            useHint: '适合管理和切换长预设，做 AB 对比也方便。',
            targets: ['预设', '系统提示词', '系统规则'],
        },
        {
            id: 'world_book_momo',
            name: '世界书扩展插件',
            category: '世界书',
            primaryUrl: 'https://github.com/1830488003/my-world-book-momo.git',
            extraUrls: [],
            useHint: '适合管理、筛选、拆分世界书，减少整本世界书长期堆在上下文里。',
            targets: ['世界书', '世界设定', 'Lorebook'],
        },
        {
            id: 'quest_system',
            name: '任务脚本扩展',
            category: '任务与流程',
            primaryUrl: 'https://github.com/1830488003/quest-system-extension.git',
            extraUrls: ['https://gitee.com/qq410847381/quest-system-extension.git'],
            useHint: '安装完刷新页面，出来个按钮就能用，适合任务流程和状态推进。',
            targets: ['任务', '流程', '状态', '剧情推进'],
        },
        {
            id: 'autocard_updater',
            name: '角色卡自动更新扩展',
            category: '角色卡',
            primaryUrl: 'https://github.com/1830488003/AutoCardUpdaterExtension.git',
            extraUrls: [],
            useHint: '适合角色信息分散、需要把设定整理回角色卡字段的场景。',
            targets: ['角色卡', 'Persona', '角色信息', '角色设定'],
        },
        {
            id: 'world_book_generator',
            name: '一键制作角色卡+世界书',
            category: '角色卡与世界书生成',
            primaryUrl: 'https://github.com/1830488003/world-book-generator.git',
            extraUrls: [],
            useHint: '适合把角色卡和世界书一起重建，减少设定分散。',
            targets: ['角色卡', '世界书', '设定重建'],
        },
        {
            id: 'auto_summary',
            name: '全自动总结扩展',
            category: '聊天总结',
            primaryUrl: 'https://github.com/1830488003/auto-summary.git',
            extraUrls: [],
            useHint: '适合聊天记录太长，想把旧楼层压缩成摘要后继续聊。',
            targets: ['聊天上下文', '聊天记录', '总结', '记忆'],
        },
        {
            id: 'real_time_status_bar',
            name: '实时状态栏插件',
            category: '状态栏',
            primaryUrl: 'https://github.com/1830488003/real-time-status-bar.git',
            extraUrls: [],
            useHint: '适合需要补状态栏、配合角色卡自动更新显示层数和状态变化。',
            targets: ['状态栏', '状态', '显示', '角色状态'],
        },
    ];

    function joinNonEmpty(parts, separator = '\n') {
        return parts
            .map((part) => String(part ?? '').trim())
            .filter(Boolean)
            .join(separator);
    }

    function stringifyPreviewContent(value) {
        if (Array.isArray(value)) {
            return value.map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                if (typeof item?.text === 'string') {
                    return item.text;
                }

                try {
                    return JSON.stringify(item, null, 2);
                } catch {
                    return String(item ?? '');
                }
            }).filter(Boolean).join('\n');
        }

        if (value && typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }

        return String(value ?? '');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function truncate(value, max = 260) {
        const text = String(value ?? '').trim();
        if (!text) {
            return '（空）';
        }
        return text.length > max ? `${text.slice(0, max)}…` : text;
    }

    function isUuidLike(value) {
        return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value || ''));
    }

    function getFriendlySourceLabel(rawLabel, fallbackIndex = 0) {
        const label = String(rawLabel || '').trim();
        if (!label) {
            return '未命名内容';
        }

        if (sourceLabelMap.has(label)) {
            return sourceLabelMap.get(label);
        }

        if (isUuidLike(label)) {
            return `扩展提示 ${fallbackIndex + 1}`;
        }

        for (const item of sourceCategoryMap) {
            if (item.match.test(label)) {
                return item.label;
            }
        }

        if (/^chat/i.test(label)) {
            return '聊天记录';
        }

        return label;
    }

    function getFriendlyCategoryLabel(rawLabel) {
        const label = String(rawLabel || '').trim();
        if (!label) {
            return '其他内容';
        }

        for (const item of sourceCategoryMap) {
            if (item.match.test(label)) {
                return item.label;
            }
        }

        if (sourceLabelMap.has(label)) {
            return sourceLabelMap.get(label);
        }

        if (isUuidLike(label)) {
            return '扩展提示';
        }

        return '其他内容';
    }

    function formatDateTime(value = new Date()) {
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }).format(value);
        } catch {
            return new Date(value).toLocaleString();
        }
    }

    function getSettingsRoot() {
        extension_settings[settingsKey] = Object.assign({}, defaultSettings, extension_settings[settingsKey] || {});
        return extension_settings[settingsKey];
    }

    function setSettings(partial) {
        Object.assign(getSettingsRoot(), partial);
        saveSettingsDebounced();
    }

    function getContextSafe() {
        try {
            return window.SillyTavern?.getContext?.() || null;
        } catch {
            return null;
        }
    }

    function resolveExtensionFolderPath() {
        const currentScript = Array.from(document.scripts).find((script) => {
            const src = script?.src || script?.getAttribute?.('src') || '';
            return src.includes('/scripts/extensions/third-party/global-prompt-orchestrator/index.js');
        });

        if (!currentScript) {
            return '/scripts/extensions/third-party/global-prompt-orchestrator';
        }

        const src = currentScript.getAttribute('src') || currentScript.src || '';
        return src.replace(/\/index\.js(?:\?.*)?$/, '');
    }

    async function fetchAssetText(fileName) {
        const basePath = resolveExtensionFolderPath();
        const response = await fetch(`${basePath}/${fileName}?v=${Date.now()}`, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`加载扩展资源失败：${fileName}`);
        }
        return response.text();
    }

    const Updater = {
        gitRepoOwner: extensionRepoOwner,
        gitRepoName: extensionRepoName,
        currentVersion: '0.0.0',
        latestVersion: '0.0.0',

        async fetchRawFileFromGitHub(filePath) {
            const url = `https://raw.githubusercontent.com/${this.gitRepoOwner}/${this.gitRepoName}/main/${filePath}`;
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`获取 ${filePath} 失败：${response.statusText}`);
            }
            return response.text();
        },

        parseVersion(content) {
            try {
                return JSON.parse(content).version || '0.0.0';
            } catch {
                return '0.0.0';
            }
        },

        compareVersions(v1, v2) {
            const parts1 = String(v1 || '0.0.0').split('.').map(Number);
            const parts2 = String(v2 || '0.0.0').split('.').map(Number);
            for (let index = 0; index < Math.max(parts1.length, parts2.length); index++) {
                const p1 = parts1[index] || 0;
                const p2 = parts2[index] || 0;
                if (p1 > p2) return 1;
                if (p1 < p2) return -1;
            }
            return 0;
        },

        async performUpdate() {
            const context = getContextSafe();
            if (!context?.common?.getRequestHeaders) {
                toastr.error('系统未就绪，请稍后重试', '上下文分析');
                return;
            }

            toastr.info('正在开始更新...', '上下文分析');
            try {
                const response = await fetch('/api/extensions/update', {
                    method: 'POST',
                    headers: context.common.getRequestHeaders(),
                    body: JSON.stringify({ extensionName }),
                });

                const resultText = await response.text();
                let resultObject;
                try {
                    resultObject = JSON.parse(resultText);
                } catch {
                    resultObject = { message: resultText };
                }

                if (!response.ok) {
                    throw new Error(resultObject.message || `HTTP ${response.status}: ${resultText}`);
                }

                toastr.success('更新成功，正在刷新页面...', '上下文分析');
                window.setTimeout(() => window.location.reload(true), 1000);
            } catch (error) {
                console.error(`[${extensionName}] update failed`, error);
                toastr.error(`更新失败：${error.message || error}`, '上下文分析');
            }
        },

        async checkForUpdates(isManual = false) {
            const $checkButton = $('#gpo-check-update');
            const $updateGuide = $('#gpo-update-guide');
            const $newVersionDisplay = $('#gpo-new-version-display');
            const $updateIndicator = $('#gpo-update-indicator');

            if (isManual) {
                $checkButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> 检查中...');
            }

            try {
                const localManifestText = await fetchAssetText(`manifest.json?t=${Date.now()}`);
                this.currentVersion = this.parseVersion(localManifestText);
                $('#gpo-current-version').text(this.currentVersion);

                const remoteManifestText = await this.fetchRawFileFromGitHub('manifest.json');
                this.latestVersion = this.parseVersion(remoteManifestText);

                if (this.compareVersions(this.latestVersion, this.currentVersion) > 0) {
                    $updateIndicator.show();
                    $newVersionDisplay.text(this.latestVersion);
                    $updateGuide.show();
                    $checkButton.prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-up"></i> 立即更新');
                    if (isManual) {
                        toastr.warning(`发现新版本 ${this.latestVersion}，点击“立即更新”可直接更新`, '上下文分析');
                    }
                } else {
                    $updateIndicator.hide();
                    $updateGuide.hide();
                    $checkButton.prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-down"></i> 检查更新');
                    if (isManual) {
                        toastr.info('当前已是最新版本', '上下文分析');
                    }
                }
            } catch (error) {
                console.error(`[${extensionName}] check updates failed`, error);
                if (isManual) {
                    toastr.error(`检查更新失败：${error.message || error}`, '上下文分析');
                }
            } finally {
                if (isManual) {
                    if (!$updateGuide.is(':visible')) {
                        $checkButton.prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-down"></i> 检查更新');
                    }
                }
            }
        },
    };

    function getActiveCharacter() {
        if (selected_group) {
            return groups.find((group) => String(group.id) === String(selected_group)) || null;
        }

        return characters[this_chid] || null;
    }

    function getActiveCharacterCard() {
        if (selected_group) {
            return null;
        }

        return characters[this_chid] || null;
    }

    function getPrimaryWorldInfoName() {
        return String(getActiveCharacterCard()?.data?.extensions?.world || '').trim();
    }

    function hasEmbeddedCharacterBook() {
        return Boolean(getActiveCharacterCard()?.data?.character_book);
    }

    function getCharacterAuxiliaryWorldInfoNames() {
        const character = getActiveCharacterCard();
        if (!character?.avatar || !Array.isArray(world_info?.charLore)) {
            return [];
        }

        const charLoreConfig = world_info.charLore.find((item) => item?.name === character.avatar);
        return Array.isArray(charLoreConfig?.extraBooks)
            ? charLoreConfig.extraBooks.map((item) => String(item || '').trim()).filter(Boolean)
            : [];
    }

    function getWorldbookStateSummary() {
        const primaryWorld = getPrimaryWorldInfoName();
        const globalWorlds = Array.isArray(selected_world_info) ? selected_world_info.map((item) => String(item || '').trim()).filter(Boolean) : [];
        const auxiliaryWorlds = getCharacterAuxiliaryWorldInfoNames();
        const groupMode = Boolean(selected_group);

        return {
            groupMode,
            primaryWorld,
            globalWorlds,
            auxiliaryWorlds,
            hasEmbeddedBook: hasEmbeddedCharacterBook(),
        };
    }

    function getPersonaSummary() {
        const avatarId = user_avatar;
        const name = power_user.personas?.[avatarId] || name1 || '';
        const description = power_user.persona_descriptions?.[avatarId]?.description || '';

        return {
            avatarId,
            name,
            description,
        };
    }

    function getPresetOptions(apiId = '') {
        const manager = getPresetManager(apiId);
        if (!manager?.select) {
            return [];
        }

        return $(manager.select)
            .find('option')
            .map((_, option) => ({
                value: option.value,
                label: option.textContent || option.innerText || option.value,
            }))
            .toArray();
    }

    function getCurrentPresetSelection(apiId = '') {
        const manager = getPresetManager(apiId);
        if (!manager) {
            return { value: '', label: '（未检测到）' };
        }

        const value = manager.getSelectedPreset?.() ?? '';
        const label = manager.getSelectedPresetName?.() ?? value ?? '（未检测到）';

        return { value, label };
    }

    function getWorldInfoEntriesFromScan() {
        const entries = state.latestWorldInfoScan?.activatedEntries || [];
        if (entries.length) {
            return entries;
        }
        return state.latestWorldInfoActivated || [];
    }

    function getWorldInfoOptions() {
        return $('#world_info')
            .find('option')
            .map((_, option) => ({
                value: String(option.value ?? ''),
                label: option.textContent || option.innerText || option.value || '',
            }))
            .get()
            .filter((option) => option.label);
    }

    function getSelectedWorldInfoOptionValues() {
        const values = $('#world_info').val();
        return Array.isArray(values) ? values.map((value) => String(value)) : [];
    }

    function getCurrentConfigSummary(snapshot = null) {
        const activeCharacter = getActiveCharacter();
        const persona = getPersonaSummary();
        const presetSelection = getCurrentPresetSelection(main_api);
        const routeLabel = main_api === 'openai' ? '聊天接口（OpenAI）' : '文本接口（非 OpenAI）';
        const worldbookState = getWorldbookStateSummary();

        const worldSummary = worldbookState.groupMode
            ? '（群聊模式没有单一卡主世界书）'
            : (worldbookState.primaryWorld || (worldbookState.hasEmbeddedBook ? '（角色卡内嵌世界书未绑定）' : '（未绑定）'));

        return [
            { label: '当前接口', value: routeLabel },
            { label: '当前预设', value: presetSelection.label || '（未检测到）' },
            { label: '角色卡', value: activeCharacter?.name || activeCharacter?.id || name2 || '（未选中）' },
            { label: '用户设定', value: persona.name || '（未检测到）' },
            { label: '角色卡主世界书', value: worldSummary },
            { label: '全局世界书', value: worldbookState.globalWorlds.length ? worldbookState.globalWorlds.join(' / ') : '（未启用）' },
            { label: '最近读取时间', value: snapshot?.capturedAt ? formatDateTime(snapshot.capturedAt) : '还没有快照' },
        ];
    }

    function readTopLevelMessageCollections(collection) {
        if (!collection?.getCollection) {
            return [];
        }

        return (collection.getCollection() || []).map((item, index) => toSourceNode(item, index)).filter(Boolean);
    }

    function toSourceNode(item, index = 0) {
        if (!item) {
            return null;
        }

        if (typeof item.getCollection === 'function') {
            const children = (item.getCollection() || []).map((child, childIndex) => toSourceNode(child, childIndex)).filter(Boolean);
            const rawLabel = item.identifier || 'collection';
            return {
                id: rawLabel,
                label: getFriendlySourceLabel(rawLabel, index),
                rawLabel,
                role: '内容块',
                tokens: children.reduce((sum, child) => sum + (child.tokens || 0), 0),
                preview: children.map((child) => child.preview).filter(Boolean).join('\n'),
                children,
            };
        }

        const rawLabel = item.identifier || item.role || 'message';
        return {
            id: rawLabel,
            label: getFriendlySourceLabel(rawLabel, index),
            rawLabel,
            role: item.role === 'system' ? '系统消息' : item.role === 'user' ? '用户消息' : item.role === 'assistant' ? '助手消息' : (item.role || '内容'),
            tokens: Number(item.tokens || item.getTokens?.() || 0),
            preview: stringifyPreviewContent(item.content || item.tool_calls || ''),
            children: [],
        };
    }

    async function getTextTokenRows(source) {
        const authorNoteContent = joinNonEmpty([
            source.beforeScenarioAnchor,
            source.afterScenarioAnchor,
            source.authorsNoteString,
        ]);
        const systemContent = joinNonEmpty([
            source.main,
            source.instruction,
            source.jailbreak,
            source.naiPreamble,
        ]);
        const rows = [
            { id: 'system', label: '系统提示词', content: systemContent },
            { id: 'story', label: 'Story String / 上下文模板', content: source.storyString || '' },
            { id: 'world', label: '世界书输出', content: source.worldInfoString || `${source.worldInfoBefore || ''}${source.worldInfoAfter || ''}` },
            { id: 'authorsNote', label: '作者注释', content: authorNoteContent },
            { id: 'examples', label: '示例对话', content: source.examplesString || source.mesExmString || '' },
            { id: 'history', label: '聊天历史', content: source.mesSendString || '' },
            { id: 'bias', label: '回复偏好', content: source.promptBias || '' },
            { id: 'runtime', label: '运行时附加项', content: source.generatedPromptCache || '' },
        ];

        const counts = await Promise.all(rows.map(async (row) => ({
            ...row,
            tokens: row.content ? await getTokenCountAsync(String(row.content)) : 0,
        })));

        return counts.filter((row) => row.tokens > 0).sort((left, right) => right.tokens - left.tokens);
    }

    function mergeTextSource(primary, fallback = {}) {
        const result = Object.assign({}, fallback);

        Object.entries(primary || {}).forEach(([key, value]) => {
            const isEmptyString = typeof value === 'string' && value.length === 0;
            const isEmptyArray = Array.isArray(value) && value.length === 0;

            if (value === undefined || value === null || isEmptyString || isEmptyArray) {
                return;
            }

            result[key] = value;
        });

        return result;
    }

    async function buildDetailedTextBlocks(source) {
        const authorNoteContent = joinNonEmpty([
            source.beforeScenarioAnchor,
            source.afterScenarioAnchor,
            source.authorsNoteString,
        ]);
        const blocks = [
            { id: 'system', title: '系统提示词', content: joinNonEmpty([source.main, source.instruction]) },
            { id: 'jailbreak', title: '附加系统规则', content: joinNonEmpty([source.jailbreak, source.naiPreamble]) },
            { id: 'story', title: 'Story String / 上下文模板', content: source.storyString || '' },
            { id: 'charDescription', title: '角色卡设定', content: source.description || source.charDescription || '' },
            { id: 'charPersonality', title: '角色卡性格', content: source.personality || source.charPersonality || '' },
            { id: 'scenario', title: '角色卡场景', content: source.scenario || source.scenarioText || '' },
            { id: 'personaDescription', title: '用户设定', content: source.persona || source.userPersona || '' },
            { id: 'world', title: '世界书输出', content: source.worldInfoString || `${source.worldInfoBefore || ''}${source.worldInfoAfter || ''}` },
            { id: 'authorsNote', title: '作者注释 / 深度锚点', content: authorNoteContent },
            { id: 'summary', title: '记忆摘要', content: source.summarizeString || '' },
            { id: 'smartContext', title: '智能上下文', content: source.smartContextString || '' },
            { id: 'vectorsMemory', title: '向量记忆', content: source.chatVectorsString || '' },
            { id: 'vectorsDataBank', title: '资料库向量', content: source.dataBankVectorsString || '' },
            { id: 'examples', title: '示例对话', content: source.examplesString || source.mesExmString || '' },
            { id: 'history', title: '聊天历史', content: source.mesSendString || '' },
            { id: 'bias', title: '回复偏好', content: source.promptBias || '' },
            { id: 'runtime', title: '运行时附加项', content: source.generatedPromptCache || '' },
        ].filter((block) => block.content);

        return Promise.all(blocks.map(async (block) => ({
            ...block,
            tokens: block.content ? await getTokenCountAsync(String(block.content)) : 0,
        })));
    }

    function applyPalette(rows) {
        return rows.map((row, index) => ({
            ...row,
            colors: colorPalette[index % colorPalette.length],
        }));
    }

    function aggregateRows(rows) {
        const bucketMap = new Map();
        rows.forEach((row) => {
            const category = getFriendlyCategoryLabel(row.id || row.label);
            if (!bucketMap.has(category)) {
                bucketMap.set(category, {
                    id: category,
                    label: category,
                    tokens: 0,
                });
            }
            bucketMap.get(category).tokens += Number(row.tokens || 0);
        });

        return applyPalette(
            Array.from(bucketMap.values()).sort((left, right) => right.tokens - left.tokens),
        );
    }

    function buildOverviewMetrics(snapshot) {
        const overviewRows = snapshot.overviewRows || snapshot.tokenRows || [];
        const utilization = snapshot.tokenBudget > 0
            ? Math.min(999, Math.round((snapshot.totalTokens / snapshot.tokenBudget) * 100))
            : 0;
        const topContributor = overviewRows[0]?.label || '暂无';
        const topContributorShare = snapshot.totalTokens > 0 && overviewRows[0]
            ? `${((overviewRows[0].tokens / snapshot.totalTokens) * 100).toFixed(1)}%`
            : '0%';

        return [
            {
                label: '接口类型',
                value: snapshot.routeLabel,
                meta: snapshot.messageArray.length
                    ? `消息数组 ${snapshot.messageArray.length} 条`
                    : `来源节点 ${snapshot.sourceNodes.length} 个`,
            },
            {
                label: '本轮上下文总量',
                value: `${snapshot.totalTokens}`,
                meta: snapshot.tokenBudget > 0
                    ? `可用上限 ${snapshot.tokenBudget} tokens`
                    : '当前路由暂时没有显示上限',
            },
            {
                label: '上下文占比',
                value: snapshot.tokenBudget > 0 ? `${utilization}%` : '—',
                meta: snapshot.tokenBudget > 0
                    ? (utilization > 100 ? '已经超预算' : utilization > 85 ? '接近上限' : '仍在安全范围')
                    : '当前只展示消耗，不比较上限',
            },
            {
                label: '世界书命中',
                value: `${snapshot.worldInfoEntries.length}`,
                meta: snapshot.worldInfoEntries.length
                    ? `当前已命中 ${snapshot.worldInfoEntries.length} 条`
                    : '这轮没有命中世界书条目',
            },
            {
                label: '最占上下文的部分',
                value: topContributor,
                meta: `约占本轮上下文 ${topContributorShare}`,
            },
            {
                label: '最近快照',
                value: formatDateTime(snapshot.capturedAt),
                meta: '打开面板后会自动重新读取一次当前状态',
            },
        ];
    }

    async function buildOpenAiSnapshot() {
        const sourceNodes = readTopLevelMessageCollections(promptManager?.getMessages?.() || promptManager?.messages);
        const chatMessages = Array.isArray(state.latestOpenAiChat) ? state.latestOpenAiChat : [];
        const tokenCounts = promptManager?.getTokenHandler?.()?.getCounts?.() || promptManager?.tokenHandler?.getCounts?.() || {};
        const tokenRows = applyPalette(
            Object.entries(tokenCounts)
                .filter(([, value]) => Number(value) > 0)
                .map(([id, tokens]) => ({
                    id,
                    label: id,
                    tokens: Number(tokens),
                }))
                .sort((left, right) => right.tokens - left.tokens),
        );

        const totalTokens = tokenRows.reduce((sum, row) => sum + row.tokens, 0);
        const tokenBudget = Math.max(0, Number(oai_settings.openai_max_context || 0) - Number(oai_settings.openai_max_tokens || 0));

        const snapshot = {
            route: 'openai',
            routeLabel: '聊天接口（OpenAI）',
            sourceNodes,
            structureBlocks: sourceNodes.map((node) => ({
                id: node.rawLabel || node.id || node.label,
                title: node.label,
                content: node.preview || '（空）',
                role: node.role,
                rawLabel: node.rawLabel,
                tokens: node.tokens || 0,
            })),
            flatPrompt: chatMessages.map((message) => `[${message.role}] ${message.content || JSON.stringify(message.tool_calls || [], null, 2)}`).join('\n\n'),
            messageArray: chatMessages,
            tokenRows: applyPalette(tokenRows.map((row, index) => ({
                ...row,
                label: getFriendlySourceLabel(row.id, index),
                rawLabel: row.id,
            }))),
            totalTokens,
            tokenBudget,
            worldInfoEntries: getWorldInfoEntriesFromScan(),
            configSummary: [],
            capturedAt: new Date(),
        };
        snapshot.overviewRows = aggregateRows(snapshot.tokenRows);
        snapshot.configSummary = getCurrentConfigSummary(snapshot);
        snapshot.overviewMetrics = buildOverviewMetrics(snapshot);
        return snapshot;
    }

    function getLastItemizedPrompt() {
        if (!Array.isArray(itemizedPrompts) || itemizedPrompts.length === 0) {
            return null;
        }

        const visibleMessageIds = new Set(chat.map((_, index) => index));
        const matchingItems = itemizedPrompts
            .filter((item) => typeof item?.mesId === 'number' && visibleMessageIds.has(item.mesId))
            .sort((left, right) => right.mesId - left.mesId);

        return matchingItems[0] || itemizedPrompts[itemizedPrompts.length - 1] || null;
    }

    async function buildTextSnapshot() {
        const source = mergeTextSource(state.latestTextPipeline, getLastItemizedPrompt() || {});
        const worldInfoString = source?.worldInfoString || `${source?.worldInfoBefore || ''}${source?.worldInfoAfter || ''}`;
        const tokenRows = source ? applyPalette(await getTextTokenRows(source)) : [];
        const structureBlocks = source ? await buildDetailedTextBlocks(source) : [];

        const snapshot = {
            route: 'text',
            routeLabel: '文本接口（非 OpenAI）',
            sourceNodes: structureBlocks.map((block) => ({
                id: block.id,
                label: getFriendlySourceLabel(block.id),
                rawLabel: block.title,
                role: 'text',
                tokens: block.tokens || 0,
                preview: block.content,
                children: [],
            })),
            structureBlocks: structureBlocks.map((block) => ({
                ...block,
                title: getFriendlySourceLabel(block.id),
                rawLabel: block.title,
            })),
            flatPrompt: source?.finalPrompt || '',
            messageArray: [],
            tokenRows,
            totalTokens: source?.finalPrompt
                ? await getTokenCountAsync(String(source.finalPrompt))
                : tokenRows.reduce((sum, row) => sum + row.tokens, 0),
            tokenBudget: Number(source?.this_max_context || 0),
            worldInfoEntries: getWorldInfoEntriesFromScan(),
            configSummary: [],
            capturedAt: new Date(),
        };
        snapshot.overviewRows = aggregateRows(snapshot.tokenRows);
        snapshot.configSummary = getCurrentConfigSummary(snapshot);
        snapshot.overviewMetrics = buildOverviewMetrics(snapshot);
        return snapshot;
    }

    async function buildSnapshot() {
        const snapshot = main_api === 'openai'
            ? await buildOpenAiSnapshot()
            : await buildTextSnapshot();

        snapshot.diagnostics = buildDiagnostics(snapshot);
        snapshot.ruleRecommendations = buildRuleRecommendations(snapshot);
        snapshot.aiSummary = buildAiSummaryPayload(snapshot);
        return snapshot;
    }

    function getSnapshotRows(snapshot) {
        return snapshot?.overviewRows || snapshot?.tokenRows || [];
    }

    function getCategoryTokens(snapshot, labels = []) {
        const labelSet = new Set(labels);
        return getSnapshotRows(snapshot)
            .filter((row) => labelSet.has(row.label))
            .reduce((sum, row) => sum + Number(row.tokens || 0), 0);
    }

    function getCategoryRatio(snapshot, labels = []) {
        if (!snapshot?.totalTokens) {
            return 0;
        }
        return getCategoryTokens(snapshot, labels) / snapshot.totalTokens;
    }

    function formatRatio(value, digits = 1) {
        return `${(Math.max(0, Number(value || 0)) * 100).toFixed(digits)}%`;
    }

    function estimateSavings(tokens, ratio = 0.25) {
        const result = Math.round(Number(tokens || 0) * ratio);
        return result > 0 ? `${Math.max(20, result)} tokens` : '少量上下文';
    }

    function getTopCategory(snapshot) {
        return getSnapshotRows(snapshot)
            .slice()
            .sort((left, right) => Number(right.tokens || 0) - Number(left.tokens || 0))[0] || null;
    }

    function getStructureBlockByIds(snapshot, ids = []) {
        const idSet = new Set(ids);
        return (snapshot?.structureBlocks || []).find((block) => {
            const blockId = String(block?.id || block?.rawLabel || block?.title || '').trim();
            return idSet.has(blockId);
        }) || null;
    }

    function getJoinedStructureText(snapshot, ids = []) {
        return ids
            .map((id) => getStructureBlockByIds(snapshot, [id])?.content || '')
            .filter(Boolean)
            .join('\n');
    }

    function simplifyComparableText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^\p{L}\p{N}\u4e00-\u9fff]/gu, '');
    }

    function getCharacterSet(value) {
        return new Set(simplifyComparableText(value).split('').filter(Boolean));
    }

    function getTextOverlapRatio(left, right) {
        const leftSet = getCharacterSet(left);
        const rightSet = getCharacterSet(right);
        const smallerSize = Math.min(leftSet.size, rightSet.size);

        if (!smallerSize) {
            return 0;
        }

        let shared = 0;
        rightSet.forEach((char) => {
            if (leftSet.has(char)) {
                shared += 1;
            }
        });

        return shared / smallerSize;
    }

    function buildRuleRecommendations(snapshot) {
        if (!snapshot) {
            return [];
        }

        const recommendations = [];
        const budgetRatio = snapshot.tokenBudget > 0 ? snapshot.totalTokens / snapshot.tokenBudget : 0;
        const historyTokens = getCategoryTokens(snapshot, ['聊天记录']);
        const worldTokens = getCategoryTokens(snapshot, ['世界书']);
        const characterTokens = getCategoryTokens(snapshot, ['角色卡']);
        const personaTokens = getCategoryTokens(snapshot, ['用户设定']);
        const systemTokens = getCategoryTokens(snapshot, ['预设与系统规则']);
        const extensionTokens = getCategoryTokens(snapshot, ['扩展注入']);
        const exampleTokens = getCategoryTokens(snapshot, ['示例对话']);
        const historyRatio = getCategoryRatio(snapshot, ['聊天记录']);
        const worldRatio = getCategoryRatio(snapshot, ['世界书']);
        const characterRatio = getCategoryRatio(snapshot, ['角色卡']);
        const personaRatio = getCategoryRatio(snapshot, ['用户设定']);
        const systemRatio = getCategoryRatio(snapshot, ['预设与系统规则']);
        const extensionRatio = getCategoryRatio(snapshot, ['扩展注入']);
        const characterAndPersonaRatio = characterRatio + personaRatio;
        const activeWorldBooks = getSelectedWorldInfoOptionValues().length;
        const topCategory = getTopCategory(snapshot);

        const pushRecommendation = ({
            id,
            priority,
            level,
            title,
            reason,
            benefit,
            actionLabel,
            actionTarget,
            assetType,
        }) => {
            recommendations.push({
                id,
                priority,
                level,
                title,
                reason,
                benefit,
                actionLabel,
                actionTarget,
                assetType,
            });
        };

        if (budgetRatio > 1) {
            pushRecommendation({
                id: 'budget-overflow',
                priority: 100,
                level: 'danger',
                title: '先处理超预算来源',
                reason: `当前上下文约 ${snapshot.totalTokens} tokens，已经超过预算 ${snapshot.tokenBudget} tokens。最占空间的是 ${topCategory?.label || '当前主要来源'}，继续生成时更早的聊天或后面的注入可能被裁掉。`,
                benefit: `优先精简头部大块内容，通常能直接回收 ${estimateSavings(topCategory?.tokens || snapshot.totalTokens, 0.3)}。`,
                actionLabel: topCategory?.label === '世界书' ? '去看世界书' : topCategory?.label === '聊天记录' ? '去看聊天上下文' : '去看详细来源',
                actionTarget: topCategory?.label === '世界书' ? 'detail-worldinfo' : topCategory?.label === '聊天记录' ? 'detail-preview' : 'detail-source',
                assetType: topCategory?.label || '上下文',
            });
        } else if (budgetRatio > 0.85) {
            pushRecommendation({
                id: 'budget-warning',
                priority: 90,
                level: 'warning',
                title: '上下文已经接近上限',
                reason: `当前使用率约 ${formatRatio(budgetRatio)}，继续增长后最容易被裁掉的是聊天历史和后置注入。现在就清理高占比来源，后面会更稳。`,
                benefit: `提前压缩 10% 到 20% 的上下文，通常就能回到安全区。`,
                actionLabel: '去看来源排行',
                actionTarget: 'detail-source',
                assetType: '上下文预算',
            });
        }

        if (historyRatio >= 0.45) {
            pushRecommendation({
                id: 'history-heavy',
                priority: 80,
                level: 'warning',
                title: '聊天记录占比过高',
                reason: `聊天记录当前约占 ${formatRatio(historyRatio)}，已经明显高于其他来源。说明这轮的主要压力不是设定块，而是会话本身太长。`,
                benefit: `优先压缩旧楼层、保留最近几轮高信息密度内容，预计能回收 ${estimateSavings(historyTokens, 0.25)}。`,
                actionLabel: '去看聊天上下文',
                actionTarget: 'detail-preview',
                assetType: '聊天上下文',
            });
        }

        if (worldRatio >= 0.3 || state.latestWorldInfoScan?.overflowed) {
            pushRecommendation({
                id: 'world-heavy',
                priority: state.latestWorldInfoScan?.overflowed ? 88 : 74,
                level: state.latestWorldInfoScan?.overflowed ? 'danger' : 'warning',
                title: '世界书命中偏重，建议优先体检',
                reason: state.latestWorldInfoScan?.overflowed
                    ? `世界书扫描阶段已经触碰预算，当前约占 ${formatRatio(worldRatio)}，后面的条目可能因为预算不足根本进不来。`
                    : `世界书当前约占 ${formatRatio(worldRatio)}，如果其中有低价值条目，会明显挤压角色卡和聊天上下文。`,
                benefit: `减少低收益命中或切换更精简的启用集，通常能回收 ${estimateSavings(worldTokens, 0.3)}。`,
                actionLabel: activeWorldBooks ? '去看世界书命中' : '去看启用集',
                actionTarget: activeWorldBooks ? 'detail-worldinfo' : 'worldbook',
                assetType: '世界书',
            });
        }

        if (characterAndPersonaRatio >= 0.32) {
            pushRecommendation({
                id: 'identity-heavy',
                priority: 70,
                level: 'warning',
                title: '角色卡和 Persona 累计过重',
                reason: `角色卡约占 ${formatRatio(characterRatio)}，用户设定约占 ${formatRatio(personaRatio)}。两者加起来已经占到 ${formatRatio(characterAndPersonaRatio)}，容易把重复设定一起塞进 prompt。`,
                benefit: `把重复描述收敛到一处，通常能回收 ${estimateSavings(characterTokens + personaTokens, 0.2)}，还会减少风格打架。`,
                actionLabel: '去看角色与 Persona 贡献',
                actionTarget: 'detail-source',
                assetType: '角色卡 / Persona',
            });
        }

        if (systemRatio >= 0.28 || exampleTokens > 0 && getCategoryRatio(snapshot, ['示例对话']) >= 0.18) {
            pushRecommendation({
                id: 'preset-heavy',
                priority: 62,
                level: 'info',
                title: '预设与系统规则偏重',
                reason: `预设与系统规则当前约占 ${formatRatio(systemRatio)}。如果你已经在角色卡、世界书里写了很多行为约束，这里再叠加很容易重复。`,
                benefit: `切换更轻的预设做对比，通常能快速验证哪些规则是必要的。`,
                actionLabel: '去切换预设',
                actionTarget: 'preset',
                assetType: '预设',
            });
        }

        if (extensionRatio >= 0.2) {
            pushRecommendation({
                id: 'extension-heavy',
                priority: 58,
                level: 'info',
                title: '扩展注入已经不轻',
                reason: `记忆摘要、向量记忆或智能上下文合计约占 ${formatRatio(extensionRatio)}。这类内容通常价值高，但如果堆太多，也会和世界书、角色卡产生重叠。`,
                benefit: `先确认扩展注入是否真的带来新增信息，再决定保留哪些来源。`,
                actionLabel: '去看详细来源',
                actionTarget: 'detail-source',
                assetType: '扩展注入',
            });
        }

        if (activeWorldBooks > 0 && snapshot.worldInfoEntries.length === 0) {
            pushRecommendation({
                id: 'world-miss',
                priority: 56,
                level: 'info',
                title: '启用了世界书，但这轮没有命中',
                reason: `当前已启用 ${activeWorldBooks} 组世界书，但最近一轮没有捕捉到激活条目。更像是触发词、聊天上下文或场景信息没对上，而不一定是“世界书不存在”。`,
                benefit: '先确认触发条件，再决定是否需要更换启用集。',
                actionLabel: '去看世界书区域',
                actionTarget: 'worldbook',
                assetType: '世界书',
            });
        }

        const characterText = getJoinedStructureText(snapshot, ['charDescription', 'charPersonality', 'scenario']);
        const personaText = getJoinedStructureText(snapshot, ['personaDescription']);
        const overlapRatio = getTextOverlapRatio(characterText, personaText);
        if (overlapRatio >= 0.6 && characterTokens > 0 && personaTokens > 0) {
            pushRecommendation({
                id: 'identity-overlap',
                priority: 64,
                level: 'warning',
                title: '角色卡和 Persona 疑似重复',
                reason: `角色卡与 Persona 的字面重合度偏高，说明它们可能在重复描述同一批规则或口吻。这样不仅浪费上下文，也可能制造优先级冲突。`,
                benefit: `把重复内容并到一处，通常能回收 ${estimateSavings(personaTokens, 0.3)}，同时减少设定打架。`,
                actionLabel: '去看详细来源',
                actionTarget: 'detail-source',
                assetType: '角色卡 / Persona',
            });
        }

        if (!recommendations.length) {
            pushRecommendation({
                id: 'healthy',
                priority: 10,
                level: 'info',
                title: '当前结构比较健康',
                reason: '这轮没有看到明显的单点爆炸来源，预算也还在可控范围。后续如果想继续优化，优先对比不同预设和世界书启用集即可。',
                benefit: '保持当前结构，后续每次大改设定后重新读取快照即可。',
                actionLabel: '去切换预设',
                actionTarget: 'preset',
                assetType: '总体结构',
            });
        }

        return recommendations
            .sort((left, right) => right.priority - left.priority)
            .slice(0, 6);
    }

    function buildAiSummaryPayload(snapshot) {
        if (!snapshot) {
            return null;
        }

        const focusBlockIds = ['charDescription', 'charPersonality', 'scenario', 'personaDescription', 'world', 'history', 'system', 'authorsNote'];
        const focusBlocks = focusBlockIds
            .map((id) => getStructureBlockByIds(snapshot, [id]))
            .filter(Boolean)
            .map((block) => ({
                id: block.id || block.rawLabel || block.title,
                title: block.title,
                tokens: Number(block.tokens || 0),
                preview: truncate(block.content, 220),
            }));

        return {
            route: snapshot.route,
            routeLabel: snapshot.routeLabel,
            totalTokens: snapshot.totalTokens,
            tokenBudget: snapshot.tokenBudget,
            budgetUsage: snapshot.tokenBudget > 0 ? formatRatio(snapshot.totalTokens / snapshot.tokenBudget) : null,
            topSources: getSnapshotRows(snapshot).slice(0, 8).map((row) => ({
                label: row.label,
                tokens: Number(row.tokens || 0),
                share: formatRatio(snapshot.totalTokens > 0 ? row.tokens / snapshot.totalTokens : 0),
            })),
            configSummary: snapshot.configSummary.slice(0, 6),
            diagnostics: (snapshot.diagnostics || []).slice(0, 6).map((item) => ({
                level: item.level,
                title: item.title,
                body: item.body,
            })),
            ruleRecommendations: (snapshot.ruleRecommendations || []).slice(0, 5).map((item) => ({
                title: item.title,
                assetType: item.assetType,
                reason: item.reason,
                benefit: item.benefit,
            })),
            worldInfoEntries: (snapshot.worldInfoEntries || []).slice(0, 6).map((entry, index) => ({
                title: entry.comment || entry.content?.slice?.(0, 40) || `条目 ${index + 1}`,
                world: entry.world || '',
                outlet: entry.outletName || entry.position || '默认出口',
            })),
            focusBlocks,
        };
    }

    function extractJsonObject(text) {
        const value = String(text || '').trim();
        const cleaned = value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        try {
            return JSON.parse(cleaned);
        } catch {
            // ignore
        }

        const startIndex = cleaned.indexOf('{');
        const endIndex = cleaned.lastIndexOf('}');
        if (startIndex >= 0 && endIndex > startIndex) {
            try {
                return JSON.parse(cleaned.slice(startIndex, endIndex + 1));
            } catch {
                return null;
            }
        }

        return null;
    }

    function dedupePluginRecommendations(items = []) {
        const seen = new Set();
        return items.filter((item) => {
            const key = String(item?.id || item?.name || item?.primaryUrl || '').trim();
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    function normalizePluginRecommendation(item) {
        if (!item || typeof item !== 'object') {
            return null;
        }

        const urls = Array.isArray(item.urls)
            ? item.urls.map((value) => String(value || '').trim()).filter(Boolean)
            : [];
        const primaryUrl = String(item.primaryUrl || item.url || urls[0] || '').trim();
        const extraUrls = urls.filter((value) => value !== primaryUrl);

        if (!primaryUrl) {
            return null;
        }

        return {
            id: String(item.id || item.name || primaryUrl).trim(),
            name: String(item.name || item.title || '相关插件').trim(),
            primaryUrl,
            extraUrls,
            why: String(item.why || item.reason || item.description || '').trim() || '这个插件适合处理当前问题。',
            useHint: String(item.useHint || item.installHint || item.use || '').trim() || pluginInstallGuide,
        };
    }

    function getPluginCatalogForAi() {
        return pluginCatalog.map((plugin) => ({
            name: plugin.name,
            primaryUrl: plugin.primaryUrl,
            extraUrls: plugin.extraUrls,
            category: plugin.category,
            targets: plugin.targets,
            useHint: plugin.useHint,
            installMethod: pluginInstallGuide,
        }));
    }

    function getFallbackPluginRecommendations(item = {}) {
        const targetText = String(item?.target || '').trim();
        const contextText = [
            item?.title,
            item?.target,
            item?.reason,
            item?.action,
        ].join('\n');

        const matches = pluginCatalog.filter((plugin) => plugin.targets.some((keyword) => (
            targetText.includes(keyword) || contextText.includes(keyword)
        )));

        let candidates = matches;
        if (!candidates.length) {
            if (targetText.includes('总体结构')) {
                candidates = pluginCatalog.filter((plugin) => ['world_book_generator', 'autocard_updater', 'preset_manager'].includes(plugin.id));
            } else if (targetText.includes('扩展注入')) {
                candidates = pluginCatalog.filter((plugin) => ['regex_manager'].includes(plugin.id));
            }
        }

        return dedupePluginRecommendations(candidates.slice(0, 3).map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            primaryUrl: plugin.primaryUrl,
            extraUrls: plugin.extraUrls,
            why: `这个问题更适合直接用你的现成插件处理：${plugin.category}。`,
            useHint: `${pluginInstallGuide} ${plugin.useHint}`,
        })));
    }

    function renderPluginRecommendationsHtml(items = []) {
        const plugins = dedupePluginRecommendations(items.map(normalizePluginRecommendation).filter(Boolean));
        if (!plugins.length) {
            return '';
        }

        const html = plugins.map((plugin) => {
            const extraUrlHtml = plugin.extraUrls.length
                ? plugin.extraUrls.map((url) => `
                    <a class="gpo-plugin-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
                `).join('<br>')
                : '';

            return `
                <div class="gpo-plugin-card">
                    <div class="gpo-plugin-name">${escapeHtml(plugin.name)}</div>
                    <div class="gpo-plugin-body">${escapeHtml(plugin.why)}</div>
                    <div class="gpo-plugin-body">安装：${escapeHtml(plugin.useHint)}</div>
                    <div class="gpo-plugin-links">
                        <a class="gpo-plugin-link" href="${escapeHtml(plugin.primaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(plugin.primaryUrl)}</a>
                        ${extraUrlHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="gpo-plugin-list">${html}</div>`;
    }

    function normalizeAiSuggestionPayload(payload, rawText) {
        const data = payload && typeof payload === 'object' ? payload : {};
        const priorities = Array.isArray(data.priorities) ? data.priorities : Array.isArray(data.items) ? data.items : [];

        return {
            generatedAt: new Date(),
            summary: String(data.summary || data.overview || '').trim() || 'AI 已基于当前快照做了一轮优化建议。',
            priorities: priorities.slice(0, 5).map((item, index) => ({
                title: String(item?.title || item?.problem || `建议 ${index + 1}`),
                target: String(item?.target || item?.assetType || item?.asset || '上下文'),
                reason: String(item?.reason || item?.why || item?.detail || '').trim() || 'AI 没有给出额外原因说明。',
                action: String(item?.action || item?.suggestion || item?.advice || '').trim() || '请先检查对应资产是否存在重复、冗余或低收益信息。',
                benefit: String(item?.expectedBenefit || item?.benefit || '').trim() || '预期收益未明确说明。',
                pluginRecommendations: (() => {
                    const aiPlugins = Array.isArray(item?.pluginRecommendations)
                        ? item.pluginRecommendations
                        : Array.isArray(item?.plugins)
                            ? item.plugins
                            : [];
                    const normalizedAiPlugins = dedupePluginRecommendations(aiPlugins.map(normalizePluginRecommendation).filter(Boolean));
                    return normalizedAiPlugins.length ? normalizedAiPlugins : getFallbackPluginRecommendations(item);
                })(),
            })),
            rawText: String(rawText || '').trim(),
        };
    }

    function buildPresetPriority(snapshot) {
        const presetTokens = getCategoryTokens(snapshot, ['预设与系统规则']);
        const presetShare = getCategoryRatio(snapshot, ['预设与系统规则']);
        if (presetTokens <= 0) {
            return null;
        }

        const presetPlugin = pluginCatalog.find((plugin) => plugin.id === 'preset_manager');
        return {
            title: '分析预设与系统规则',
            target: '预设',
            reason: `预设与系统规则当前占用 ${presetTokens} tokens（约 ${formatRatio(presetShare)}）。这块虽然不一定最大，但它会长期常驻，并且经常和角色卡、世界书、扩展提示互相重复或打架。`,
            action: '先用预设管理器查看当前启用的预设，把重复的格式规则、系统限制和示例性指令拆出来做 AB 对比，保留真正有效的那部分。',
            benefit: presetTokens > 4000
                ? `如果这块有冗余，通常能回收 ${estimateSavings(presetTokens, 0.25)}，同时减少系统规则冲突。`
                : '即使 token 占比不大，也能减少规则打架，提升后续调试效率。',
            pluginRecommendations: presetPlugin ? [{
                id: presetPlugin.id,
                name: presetPlugin.name,
                primaryUrl: presetPlugin.primaryUrl,
                extraUrls: presetPlugin.extraUrls,
                why: '你已经有预设管理器，最适合拿来管理长预设、拆分系统规则和做 AB 对比。',
                useHint: `${pluginInstallGuide} ${presetPlugin.useHint}`,
            }] : [],
        };
    }

    function enrichAiSuggestionPayload(aiSuggestion, snapshot) {
        if (!aiSuggestion || !snapshot) {
            return aiSuggestion;
        }

        const priorities = Array.isArray(aiSuggestion.priorities) ? [...aiSuggestion.priorities] : [];
        const hasPresetPriority = priorities.some((item) => {
            const target = String(item?.target || '').trim();
            const title = String(item?.title || '').trim();
            return target.includes('预设') || title.includes('预设');
        });

        if (!hasPresetPriority) {
            const presetPriority = buildPresetPriority(snapshot);
            if (presetPriority) {
                priorities.push(presetPriority);
            }
        }

        aiSuggestion.priorities = priorities.slice(0, 6);
        return aiSuggestion;
    }

    function clearAiSuggestion() {
        state.aiSuggestion = null;
        state.aiSuggestionError = '';
        state.aiSuggestionLoading = false;
    }

    async function waitForTavernHelper(retries = 10, interval = 250) {
        for (let index = 0; index < retries; index++) {
            if (window.TavernHelper && typeof window.TavernHelper.generateRaw === 'function') {
                return window.TavernHelper;
            }

            await new Promise((resolve) => window.setTimeout(resolve, interval));
        }

        return null;
    }

    async function generateAiSuggestionText({ systemPrompt, prompt }) {
        const tavernHelper = await waitForTavernHelper();

        if (tavernHelper?.generateRaw) {
            return await tavernHelper.generateRaw({
                ordered_prompts: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
                max_new_tokens: 1400,
            });
        }

        return await generateRaw({
            prompt,
            systemPrompt,
            responseLength: 420,
        });
    }

    async function requestAiSuggestion() {
        if (state.aiSuggestionLoading) {
            return;
        }

        if (!state.lastSnapshot?.aiSummary) {
            toastr.warning('请先刷新一次当前快照，再生成 AI 建议', '上下文分析');
            return;
        }

        state.aiSuggestionLoading = true;
        state.aiSuggestionError = '';
        toastr.info('正在生成 AI 优化建议，请稍候…', '上下文分析');
        renderAll();

        const systemPrompt = [
            '你是 SillyTavern 的上下文优化顾问。',
            '你只能依据用户给出的快照摘要提出建议，不要臆测未提供的数据。',
            '目标是帮助用户优先减少低收益上下文占用，同时保留角色一致性。',
            '输出必须是 JSON 对象，不要输出 Markdown，不要补充多余解释。',
        ].join('\n');

        const prompt = [
            '请分析下面的 SillyTavern prompt 快照摘要，并给出优化建议。',
            '要求：',
            '1. 你要按“真懂酒馆插件生态”的方式给建议，不能只给抽象建议。',
            '2. summary 用一句话概括当前最大问题。',
            '3. priorities 最多 4 条，按优先级排序。',
            '4. 每条都必须包含 title、target、reason、action、expectedBenefit、pluginRecommendations。',
            '5. target 只能使用：预设、世界书、角色卡、Persona、聊天上下文、扩展注入、总体结构、格式修复、状态栏。',
            '6. 如果问题能用用户现有插件生态解决，优先推荐插件，不要只说“去压缩”“去优化”。',
            '7. pluginRecommendations 必须是数组；每项包含 name、primaryUrl、extraUrls、why、useHint。',
            '8. useHint 里要明确写出：点击酒馆左侧三个骰子图标，找到“安装扩展”，粘贴网址安装，安装后刷新页面。',
            '9. 对应关系要贴近酒馆玩法：',
            '   - 世界书太长或需要整理：优先推荐世界书扩展插件、角色卡+世界书生成器',
            '   - 聊天记录太长：优先推荐记忆插件、全自动总结扩展',
            '   - 预设太长或要 AB 测试：优先推荐预设管理器',
            '   - 角色信息分散或想回写角色卡：优先推荐角色卡自动更新扩展',
            '   - 消息格式、状态栏、思维链、正则修复：优先推荐自动修复格式插件/正则管理器、实时状态栏插件',
            '10. 不要建议自动修改，只给“用户手动去改什么”或“安装哪个插件解决什么”。',
            '可用插件目录如下：',
            JSON.stringify(getPluginCatalogForAi(), null, 2),
            '快照摘要如下：',
            JSON.stringify(state.lastSnapshot.aiSummary, null, 2),
        ].join('\n\n');

        try {
            state.runtimeCaptureMuted = true;
            const raw = await generateAiSuggestionText({ prompt, systemPrompt });
            const parsed = extractJsonObject(raw);
            if (!parsed) {
                throw new Error('AI 返回了内容，但没有解析出有效 JSON。');
            }
            state.aiSuggestion = enrichAiSuggestionPayload(
                normalizeAiSuggestionPayload(parsed, raw),
                state.lastSnapshot,
            );
            toastr.success('AI 优化建议已生成', '上下文分析');
        } catch (error) {
            console.error(`[${extensionName}] ai suggestion failed`, error);
            state.aiSuggestionError = error.message || String(error);
            state.aiSuggestion = null;
            toastr.error(`AI 建议生成失败：${state.aiSuggestionError}`, '上下文分析');
        } finally {
            state.runtimeCaptureMuted = false;
            state.aiSuggestionLoading = false;
            renderAll();
        }
    }

    function getActionTargetByAsset(assetType = '') {
        const text = String(assetType || '').trim();
        if (!text) {
            return 'detail-source';
        }

        if (text.includes('预设')) {
            return 'preset';
        }
        if (text.includes('世界书')) {
            return 'worldbook';
        }
        if (text.includes('聊天')) {
            return 'detail-preview';
        }
        if (text.includes('Persona')) {
            return 'detail-source';
        }
        if (text.includes('角色卡')) {
            return 'detail-source';
        }
        if (text.includes('扩展')) {
            return 'detail-source';
        }

        return 'detail-source';
    }

    function buildDiagnostics(snapshot) {
        if (!snapshot) {
            return [{
                level: 'info',
                title: '还没有快照',
                body: '点击“刷新快照”后，我会用当前配置做一次 dry-run，把来源树、最终 prompt、token 分布和世界书扫描结果重新汇总出来。',
            }];
        }

        const diagnostics = [];

        if (!snapshot.sourceNodes.length) {
            diagnostics.push({
                level: 'warning',
                title: '没有抓到来源树',
                body: '当前没有解析到可展示的 prompt 来源。可能是还没生成过，或者当前角色 / 群聊还没有形成完整上下文。',
            });
        }

        if (snapshot.tokenBudget > 0 && snapshot.totalTokens > snapshot.tokenBudget) {
            diagnostics.push({
                level: 'danger',
                title: 'Token 已超预算',
                body: `当前上下文约 ${snapshot.totalTokens} tokens，已经高于可用预算 ${snapshot.tokenBudget} tokens。建议先精简世界书、示例对话或聊天历史。`,
            });
        } else if (snapshot.tokenBudget > 0 && snapshot.totalTokens > snapshot.tokenBudget * 0.85) {
            diagnostics.push({
                level: 'warning',
                title: 'Token 接近上限',
                body: `当前上下文约 ${snapshot.totalTokens} tokens，已接近预算 ${snapshot.tokenBudget} tokens。继续增长后可能开始裁切聊天历史。`,
            });
        }

        if (!snapshot.flatPrompt) {
            diagnostics.push({
                level: 'warning',
                title: '最终内容为空',
                body: '当前还没有拼出最终 prompt。请确认是否已选中角色、世界书，以及当前 API 是否已经准备好。',
            });
        }

        if (!snapshot.worldInfoEntries.length) {
            diagnostics.push({
                level: 'info',
                title: '本轮没有世界书激活条目',
                body: '如果你预期应该命中世界书，可以检查 persona、scenario、creator notes 和聊天内容是否真的带上了触发信息。',
            });
        }

        if (state.latestWorldInfoScan?.overflowed) {
            diagnostics.push({
                level: 'warning',
                title: '世界书扫描触发了预算截断',
                body: `世界书扫描阶段已经触碰预算，当前扫描预算大约是 ${state.latestWorldInfoScan.budget || 0} tokens。后面的条目可能因为预算不足没有进入最终 prompt。`,
            });
        }

        return diagnostics;
    }

    function renderControlOptions() {
        const presetOptions = getPresetOptions(main_api);
        const presetSelection = getCurrentPresetSelection(main_api);

        const presetHtml = presetOptions.length
            ? presetOptions.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === presetSelection.value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
            : '<option value="">当前路由没有可切换预设</option>';

        $('#gpo-control-panel').html(`
            <div class="gpo-control-grid">
                <div class="gpo-control-item">
                    <label for="gpo-preset-select">当前 API 预设</label>
                    <select id="gpo-preset-select">${presetHtml}</select>
                </div>
            </div>
        `);
    }

    function renderJumpButton(label, target) {
        return `
            <button type="button" class="gpo-jump-button" data-jump-target="${escapeHtml(target)}">
                ${escapeHtml(label)}
            </button>
        `;
    }

    function renderAdjustPanels(snapshot = null) {
        const presetOptions = getPresetOptions(main_api);
        const presetSelection = getCurrentPresetSelection(main_api);
        const worldInfoOptions = getWorldInfoOptions();
        const selectedWorldValues = new Set(getSelectedWorldInfoOptionValues());
        const ruleRecommendations = snapshot?.ruleRecommendations || [];

        const renderSelect = ({ selectId, label, options, selectedValue, emptyLabel, helper }) => {
            const optionsHtml = options.length
                ? options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
                : `<option value="">${escapeHtml(emptyLabel)}</option>`;

            return `
                <div class="gpo-control-grid">
                    <div class="gpo-control-item">
                        <label for="${escapeHtml(selectId)}">${escapeHtml(label)}</label>
                        <select id="${escapeHtml(selectId)}">${optionsHtml}</select>
                    </div>
                    <div class="gpo-adjust-helper">${escapeHtml(helper)}</div>
                </div>
            `;
        };

        const ruleHtml = ruleRecommendations.length
            ? ruleRecommendations.map((item) => `
                <div class="gpo-suggestion-card gpo-suggestion-card-${escapeHtml(item.level)}">
                    <div class="gpo-suggestion-head">
                        <div class="gpo-suggestion-title">${escapeHtml(item.title)}</div>
                        <div class="gpo-suggestion-badge">${escapeHtml(item.assetType || '上下文')}</div>
                    </div>
                    <div class="gpo-suggestion-body">${escapeHtml(item.reason)}</div>
                    <div class="gpo-suggestion-benefit">预期收益：${escapeHtml(item.benefit || '请先做一次小幅调整，再观察快照变化。')}</div>
                    <div class="gpo-suggestion-actions">
                        ${renderJumpButton(item.actionLabel || '去查看', item.actionTarget || 'detail-source')}
                    </div>
                </div>
            `).join('')
            : '<div class="gpo-empty-state">刷新快照后，这里会根据占比、预算和命中情况给出优先级建议。</div>';
        $('#gpo-adjust-rules-panel').html(`<div class="gpo-suggestion-list">${ruleHtml}</div>`);

        const aiActionButtons = `
            <div class="gpo-ai-actions">
                <button type="button" id="gpo-generate-ai-suggestion" class="gpo-ai-button gpo-ai-button-primary"${!snapshot || state.aiSuggestionLoading ? ' disabled' : ''}>
                    ${state.aiSuggestion ? '重新生成 AI 建议' : '生成 AI 建议'}
                </button>
                ${renderJumpButton('去看详细来源', 'detail-source')}
            </div>
        `;
        if (!snapshot) {
            $('#gpo-adjust-ai-panel').html(`
                <div class="gpo-empty-state">
                    先刷新一次当前快照，再让 AI 依据整理后的摘要给你建议。
                </div>
                ${aiActionButtons}
            `);
        } else if (state.aiSuggestionLoading) {
            $('#gpo-adjust-ai-panel').html(`
                <div class="gpo-ai-summary-card">
                    <div class="gpo-ai-summary-body">正在调用当前连接的 AI 生成建议。它只会读取插件整理后的摘要，不会直接把整份原始 prompt 发出去。</div>
                </div>
                ${aiActionButtons}
            `);
        } else if (state.aiSuggestionError) {
            $('#gpo-adjust-ai-panel').html(`
                <div class="gpo-suggestion-card gpo-suggestion-card-warning">
                    <div class="gpo-suggestion-title">AI 建议生成失败</div>
                    <div class="gpo-suggestion-body">${escapeHtml(state.aiSuggestionError)}</div>
                    <div class="gpo-suggestion-benefit">你仍然可以先按照左侧规则建议做手动调整。</div>
                </div>
                ${aiActionButtons}
            `);
        } else if (state.aiSuggestion) {
            const aiPriorityHtml = state.aiSuggestion.priorities.length
                ? state.aiSuggestion.priorities.map((item) => `
                    <div class="gpo-ai-priority-card">
                    <div class="gpo-ai-priority-head">
                        <div class="gpo-ai-priority-title">${escapeHtml(item.title)}</div>
                        <div class="gpo-ai-priority-badge">${escapeHtml(item.target)}</div>
                    </div>
                    <div class="gpo-ai-priority-body">${escapeHtml(item.reason)}</div>
                    <div class="gpo-ai-priority-benefit">怎么改：${escapeHtml(item.action)}\n预期收益：${escapeHtml(item.benefit)}</div>
                    ${renderPluginRecommendationsHtml(item.pluginRecommendations || [])}
                    <div class="gpo-ai-priority-actions">
                        ${renderJumpButton(`去看${item.target}`, getActionTargetByAsset(item.target))}
                    </div>
                </div>
            `).join('')
                : '<div class="gpo-empty-state">AI 返回了结果，但没有整理出结构化优先级。你可以展开原始响应查看。</div>';

            $('#gpo-adjust-ai-panel').html(`
                <div class="gpo-ai-summary-card">
                    <div class="gpo-ai-meta">
                        <div class="gpo-ai-meta-tag">AI 建议</div>
                        <div class="gpo-ai-meta-tag">不会自动修改资产</div>
                        <div class="gpo-ai-meta-tag">${escapeHtml(formatDateTime(state.aiSuggestion.generatedAt))}</div>
                    </div>
                    <div class="gpo-ai-summary-body">${escapeHtml(state.aiSuggestion.summary)}</div>
                    <div class="gpo-ai-summary-note">说明：AI 只看插件整理过的摘要，不会直接读取整份原始 prompt，也不会自动写回预设、世界书或角色卡。安装插件时统一按这个方式：${escapeHtml(pluginInstallGuide)}</div>
                </div>
                <div class="gpo-ai-priority-list">${aiPriorityHtml}</div>
                ${aiActionButtons}
                <details class="gpo-ai-raw">
                    <summary>查看原始 AI 响应</summary>
                    <pre class="gpo-code">${escapeHtml(state.aiSuggestion.rawText || '（空）')}</pre>
                </details>
            `);
        } else {
            $('#gpo-adjust-ai-panel').html(`
                <div class="gpo-ai-summary-card">
                    <div class="gpo-ai-summary-body">当你想知道“应该先改哪一类资产、预期能省多少上下文”时，可以在这里让当前连接的 AI 给你一份调整顺序。</div>
                    <div class="gpo-ai-summary-note">它只给建议，不会自动修改。</div>
                </div>
                ${aiActionButtons}
            `);
        }

        const topCategory = getTopCategory(snapshot);
        const focusItems = snapshot ? [
            `当前最占上下文：${topCategory?.label || '暂无'}${topCategory ? `（${topCategory.tokens} tokens）` : ''}`,
            `本轮世界书命中：${snapshot.worldInfoEntries.length} 条`,
            `角色卡 + Persona：${formatRatio(getCategoryRatio(snapshot, ['角色卡']) + getCategoryRatio(snapshot, ['用户设定']))}`,
            `聊天记录占比：${formatRatio(getCategoryRatio(snapshot, ['聊天记录']))}`,
            '这一页只负责建议和跳转，不会直接修改任何资产。',
        ] : [
            '重点 1：世界书启用集',
            '重点 2：提示词预设',
            '重点 3：角色卡描述与性格',
            '重点 4：用户角色描述（Persona）',
            '重点 5：聊天上下文到底进入了什么',
        ];

        $('#gpo-adjust-focus-panel').html(`
            <div class="gpo-adjust-focus-list">
                ${focusItems.map((item) => `<div class="gpo-adjust-focus-item">${escapeHtml(item)}</div>`).join('')}
            </div>
        `);

        const guideCards = [
            {
                title: '切换预设做 AB 对比',
                body: '当建议提到“系统规则偏重”时，先切一个更轻的预设，再刷新快照看差异。',
                badge: '预设',
                target: 'preset',
                label: '切到预设区域',
            },
            {
                title: '检查世界书命中和启用集',
                body: '当世界书过重、命中太多或完全没命中时，先看命中条目，再决定是否切换启用集。',
                badge: '世界书',
                target: 'worldbook',
                label: '切到世界书区域',
            },
            {
                title: '查看角色卡与 Persona 贡献',
                body: '当角色卡和 Persona 累计过重或疑似重复时，到详细来源里逐块对比最直观。',
                badge: '设定',
                target: 'detail-source',
                label: '切到详细来源',
            },
            {
                title: '确认聊天上下文到底进了什么',
                body: '当聊天记录占比过高时，先看结构拆解和最终文本，再决定要不要压缩旧楼层。',
                badge: '聊天上下文',
                target: 'detail-preview',
                label: '切到发送内容',
            },
        ];
        $('#gpo-adjust-guide-panel').html(`
            <div class="gpo-guide-list">
                ${guideCards.map((item) => `
                    <div class="gpo-guide-card">
                        <div class="gpo-guide-head">
                            <div class="gpo-guide-title">${escapeHtml(item.title)}</div>
                            <div class="gpo-guide-badge">${escapeHtml(item.badge)}</div>
                        </div>
                        <div class="gpo-guide-body">${escapeHtml(item.body)}</div>
                        <div class="gpo-guide-actions">
                            ${renderJumpButton(item.label, item.target)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `);

        $('#gpo-adjust-preset-panel').html(renderSelect({
            selectId: 'gpo-adjust-preset-select',
            label: '当前 API 预设',
            options: presetOptions,
            selectedValue: presetSelection.value,
            emptyLabel: '当前路由没有可切换预设',
            helper: `当前接口：${main_api === 'openai' ? '聊天接口（OpenAI）' : '文本接口（非 OpenAI）'}`,
        }));

        const worldInfoOptionsHtml = worldInfoOptions.length
            ? worldInfoOptions.map((option) => `<option value="${escapeHtml(option.value)}"${selectedWorldValues.has(option.value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
            : '';
        $('#gpo-adjust-worldbook-multiselect').html(worldInfoOptionsHtml);

        const liveConfigSummary = getCurrentConfigSummary(snapshot);
        const worldSummary = [
            liveConfigSummary.find((item) => item.label === '角色卡'),
            liveConfigSummary.find((item) => item.label === '角色卡主世界书'),
            liveConfigSummary.find((item) => item.label === '全局世界书'),
            {
                label: '用户设定说明',
                value: getPersonaSummary().description ? truncate(getPersonaSummary().description, 120) : '（未填写）',
            },
            {
                label: '这页建议的用法',
                value: '切换启用集后请重新读取快照，再看规则建议和 AI 建议有没有变化。',
            },
        ].filter(Boolean);
        renderConfigSummary('#gpo-adjust-worldbook-panel', worldSummary);
    }

    function renderConfigSummary(targetSelector, items) {
        const summaryHtml = items.length
            ? items.map((item) => `
                <div class="gpo-summary-card">
                    <div class="gpo-summary-label">${escapeHtml(item.label)}</div>
                    <div class="gpo-summary-value">${escapeHtml(item.value || '（空）')}</div>
                </div>
            `).join('')
            : '<div class="gpo-empty-state">当前没有可展示的配置摘要。</div>';

        $(targetSelector).html(items.length ? `<div class="gpo-summary-grid">${summaryHtml}</div>` : summaryHtml);
    }

    function renderOverviewHero(snapshot) {
        if (!snapshot) {
            $('#gpo-overview-hero').html('<div class="gpo-empty-state">还没有快照。先点击右上角刷新，再看这轮 prompt 的总体概况。</div>');
            return;
        }

        const cardsHtml = snapshot.overviewMetrics.slice(0, 6).map((item) => `
            <div class="gpo-hero-card">
                <div class="gpo-hero-label">${escapeHtml(item.label)}</div>
                <div class="gpo-hero-value">${escapeHtml(item.value)}</div>
                <div class="gpo-hero-meta">${escapeHtml(item.meta || '')}</div>
            </div>
        `).join('');

        $('#gpo-overview-hero').html(cardsHtml);
    }

    function buildDonutGradient(rows, totalTokens) {
        if (!rows.length || totalTokens <= 0) {
            return 'conic-gradient(rgba(255,255,255,0.08) 0deg 360deg)';
        }

        let offset = 0;
        const segments = rows.slice(0, 6).map((row) => {
            const percentage = row.tokens / totalTokens;
            const degrees = Math.max(6, percentage * 360);
            const start = offset;
            const end = Math.min(360, offset + degrees);
            offset = end;
            return `${row.colors[0]} ${start}deg ${end}deg`;
        });

        if (offset < 360) {
            segments.push(`rgba(255,255,255,0.08) ${offset}deg 360deg`);
        }

        return `conic-gradient(${segments.join(', ')})`;
    }

    function renderOverviewComposition(snapshot) {
        if (!snapshot) {
            $('#gpo-overview-composition').html('<div class="gpo-empty-state">刷新快照后，这里会把主要来源占比画成图表。</div>');
            return;
        }

        const rows = (snapshot.overviewRows || snapshot.tokenRows).slice(0, 6);
        const donutGradient = buildDonutGradient(rows, snapshot.totalTokens);
        const utilization = snapshot.tokenBudget > 0
            ? `${Math.min(999, ((snapshot.totalTokens / snapshot.tokenBudget) * 100)).toFixed(1)}%`
            : '仅展示消耗';

        const listHtml = rows.length
            ? rows.map((row) => {
                const percentage = snapshot.totalTokens > 0 ? ((row.tokens / snapshot.totalTokens) * 100) : 0;
                return `
                    <div class="gpo-composition-item">
                        <div class="gpo-composition-head">
                            <div class="gpo-composition-name">${escapeHtml(row.label)}</div>
                            <div class="gpo-composition-meta">${row.tokens} tokens · ${percentage.toFixed(1)}%</div>
                        </div>
                        <div class="gpo-progress">
                            <div class="gpo-progress-fill" style="width: ${Math.min(100, percentage)}%; --gpo-color-start: ${row.colors[0]}; --gpo-color-end: ${row.colors[1]};"></div>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="gpo-empty-state">这轮没有可拆分的 token 构成数据。</div>';

        $('#gpo-overview-composition').html(`
            <div class="gpo-overview-composition">
                <div class="gpo-donut-wrap">
                    <div class="gpo-donut" style="--gpo-donut-bg: ${donutGradient};">
                        <div class="gpo-donut-center">
                            <div>
                                <div class="gpo-donut-number">${snapshot.totalTokens}</div>
                                <div class="gpo-donut-label">本轮上下文总量<br>${escapeHtml(utilization)}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="gpo-composition-list">${listHtml}</div>
            </div>
        `);
    }

    function renderOverviewInsights(snapshot) {
        const diagnostics = snapshot?.diagnostics || buildDiagnostics(snapshot);
        const recommendations = snapshot?.ruleRecommendations?.slice(0, 2) || [];
        const topSources = snapshot?.overviewRows?.slice(0, 3) || [];
        const items = [];

        if (snapshot) {
            items.push({
                title: '一句话总结',
                body: snapshot.tokenBudget > 0
                    ? `当前 prompt 使用了 ${snapshot.totalTokens} tokens，可用预算约 ${snapshot.tokenBudget} tokens。`
                    : `当前 prompt 使用了 ${snapshot.totalTokens} tokens，当前路由没有展示可比较的预算上限。`,
            });
        }

        if (topSources.length) {
            items.push({
                title: '最占上下文的几部分',
                body: topSources.map((row, index) => `${index + 1}. ${row.label} · ${row.tokens} tokens`).join('\n'),
            });
        }

        recommendations.forEach((item) => {
            items.push({
                title: item.title,
                body: item.reason,
            });
        });

        diagnostics.slice(0, 2).forEach((item) => {
            items.push({
                title: item.title,
                body: item.body,
            });
        });

        const html = items.length
            ? items.map((item) => `
                <div class="gpo-insight-item">
                    <div class="gpo-insight-title">${escapeHtml(item.title)}</div>
                    <div class="gpo-insight-body">${escapeHtml(item.body)}</div>
                </div>
            `).join('')
            : '<div class="gpo-empty-state">刷新快照后，这里会给出简短结论和风险提示。</div>';

        $('#gpo-overview-insights').html(`<div class="gpo-insight-list">${html}</div>`);
    }

    function renderOverviewRanking(snapshot) {
        const rows = snapshot?.overviewRows || [];
        if (!rows.length) {
            $('#gpo-overview-ranking').html('<div class="gpo-empty-state">没有可展示的来源排行。</div>');
            return;
        }

        const html = rows.slice(0, 8).map((row, index) => {
            const percentage = snapshot.totalTokens > 0 ? ((row.tokens / snapshot.totalTokens) * 100) : 0;
            return `
                <div class="gpo-ranking-item">
                    <div class="gpo-ranking-head">
                        <div class="gpo-ranking-name">#${index + 1} ${escapeHtml(row.label)}</div>
                        <div class="gpo-ranking-meta">${row.tokens} tokens</div>
                    </div>
                    <div class="gpo-progress">
                        <div class="gpo-progress-fill" style="width: ${Math.min(100, percentage)}%; --gpo-color-start: ${row.colors[0]}; --gpo-color-end: ${row.colors[1]};"></div>
                    </div>
                </div>
            `;
        }).join('');

        $('#gpo-overview-ranking').html(`<div class="gpo-ranking-list">${html}</div>`);
    }

    function renderOverviewConfig(snapshot) {
        if (!snapshot) {
            $('#gpo-overview-config').html('<div class="gpo-empty-state">这里会显示当前路由、预设、角色、Persona 和世界书集合。</div>');
            return;
        }

        renderConfigSummary('#gpo-overview-config', snapshot.configSummary.slice(0, 6));
    }

    function renderSourceTree(snapshot) {
        if (!snapshot?.sourceNodes?.length) {
            $('#gpo-source-tree').html('<div class="gpo-empty-state">当前还没有可展示的来源树。可以先点击“刷新快照”，或者先实际生成一轮。</div>');
            return;
        }

        const html = snapshot.sourceNodes.map((node) => `
            <div class="gpo-source-item">
                <div class="gpo-source-head">
                    <div class="gpo-source-name">${escapeHtml(node.label)}</div>
                    <div class="gpo-source-meta">${Number(node.tokens || 0)} tokens</div>
                </div>
                <div class="gpo-source-role">${escapeHtml(node.role || '内容')}</div>
                <div class="gpo-source-preview">${escapeHtml(truncate(node.preview, 600))}</div>
            </div>
        `).join('');

        $('#gpo-source-tree').html(`<div class="gpo-source-tree">${html}</div>`);
    }

    function renderPreview(snapshot) {
        if (!snapshot) {
            const empty = '<div class="gpo-empty-state">还没有 prompt 快照。点击“刷新快照”后，这里会显示结构视图、扁平视图和消息数组。</div>';
            $('#gpo-preview-structure').html(empty);
            $('#gpo-preview-flat').html(empty);
            $('#gpo-preview-messages').html(empty);
            return;
        }

        const structureHtml = snapshot.structureBlocks.length
            ? snapshot.structureBlocks.map((block) => `
                <div class="gpo-preview-block">
                    <div class="gpo-preview-block-title">${escapeHtml(block.title)} · ${Number(block.tokens || 0)} tokens</div>
                    <pre class="gpo-code">${escapeHtml(block.content || '（空）')}</pre>
                </div>
            `).join('')
            : '<div class="gpo-empty-state">结构视图暂时没有内容。</div>';

        const flatText = snapshot.flatPrompt || (snapshot.messageArray.length ? JSON.stringify(snapshot.messageArray, null, 2) : '');
        const flatHtml = flatText
            ? `<div class="gpo-preview-block"><pre class="gpo-code">${escapeHtml(flatText)}</pre></div>`
            : '<div class="gpo-empty-state">当前没有扁平化结果。</div>';

        const messageHtml = snapshot.messageArray.length
            ? snapshot.messageArray.map((message, index) => `
                <div class="gpo-preview-block">
                    <div class="gpo-preview-block-title">#${index + 1} · ${escapeHtml(message.role || 'unknown')}</div>
                    <pre class="gpo-code">${escapeHtml(typeof message.content === 'string' ? message.content : JSON.stringify(message, null, 2))}</pre>
                </div>
            `).join('')
            : '<div class="gpo-empty-state">当前路由不是消息数组模式，或者本轮还没有抓到 chat completion 消息。</div>';

        $('#gpo-preview-structure').html(structureHtml);
        $('#gpo-preview-flat').html(flatHtml);
        $('#gpo-preview-messages').html(messageHtml);
        syncPreviewTab();
    }

    function renderTokenPanel(snapshot) {
        if (!snapshot) {
            $('#gpo-token-panel').html('<div class="gpo-empty-state">还没有 token 数据。刷新快照后，这里会显示预算、占比和主要来源消耗。</div>');
            return;
        }

        const budgetText = snapshot.tokenBudget > 0 ? `${snapshot.totalTokens} / ${snapshot.tokenBudget}` : `${snapshot.totalTokens}`;
        const rowsHtml = snapshot.tokenRows.length
            ? snapshot.tokenRows.map((row) => {
                const denominator = snapshot.tokenBudget > 0 ? snapshot.tokenBudget : Math.max(snapshot.totalTokens, 1);
                const percentage = denominator > 0 ? ((row.tokens / denominator) * 100) : 0;
                return `
                    <div class="gpo-token-row">
                        <div class="gpo-token-row-header">
                            <span>${escapeHtml(row.label)}</span>
                            <span>${row.tokens} tokens · ${percentage.toFixed(1)}%</span>
                        </div>
                        <div class="gpo-progress">
                            <div class="gpo-progress-fill" style="width: ${Math.min(100, percentage)}%; --gpo-color-start: ${row.colors[0]}; --gpo-color-end: ${row.colors[1]};"></div>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="gpo-empty-state">这轮没有可拆分的 token 统计。</div>';

        $('#gpo-token-panel').html(`
            <div class="gpo-token-panel">
                <div class="gpo-token-summary">
                    <div class="gpo-token-summary-label">当前上下文占用</div>
                    <strong class="gpo-token-summary-value">${escapeHtml(budgetText)}</strong>
                    <div class="gpo-token-summary-meta">接口类型：${escapeHtml(snapshot.routeLabel)}</div>
                </div>
                ${rowsHtml}
            </div>
        `);
    }

    function renderWorldInfo(targetSelector, entries) {
        if (!entries.length) {
            $(targetSelector).html('<div class="gpo-empty-state">当前没有抓到世界书激活结果。这里会优先展示最近一轮 dry-run 或实际生成扫描出的条目。</div>');
            return;
        }

        const html = entries.map((entry, index) => {
            const title = entry.comment || entry.content?.slice?.(0, 32) || `条目 ${index + 1}`;
            const outlet = entry.outletName || entry.position || '默认出口';
            const meta = [
                entry.world ? `来源：${entry.world}` : '',
                entry.uid !== undefined ? `UID：${entry.uid}` : '',
                outlet ? `出口：${outlet}` : '',
                Array.isArray(entry.key) && entry.key.length ? `主键：${entry.key.join(', ')}` : '',
            ].filter(Boolean).join('\n');

            return `
                <div class="gpo-world-item">
                    <div class="gpo-world-title">${escapeHtml(title)}</div>
                    <div class="gpo-world-meta">${escapeHtml(meta || '没有额外元数据')}</div>
                </div>
            `;
        }).join('');

        $(targetSelector).html(`<div class="gpo-world-list">${html}</div>`);
    }

    function renderWorldbookSummary(targetSelector) {
        const summary = getWorldbookStateSummary();
        const items = [
            {
                label: '角色卡主世界书',
                value: summary.groupMode
                    ? '（群聊模式没有单一卡主世界书）'
                    : (summary.primaryWorld || (summary.hasEmbeddedBook ? '（角色卡有内嵌世界书，但当前未绑定主世界书）' : '（未绑定）')),
            },
            {
                label: '全局世界书启用集',
                value: summary.globalWorlds.length ? summary.globalWorlds.join(' / ') : '（未启用）',
            },
        ];

        if (!summary.groupMode && summary.auxiliaryWorlds.length) {
            items.push({
                label: '角色卡附加世界书',
                value: summary.auxiliaryWorlds.join(' / '),
            });
        }

        items.push({
            label: '读取规则',
            value: summary.groupMode
                ? '当前是群聊模式，所以这里只展示全局世界书和本轮激活条目。'
                : '主世界书读取角色卡 data.extensions.world；全局世界书读取 world_info.globalSelect / selected_world_info。',
        });

        renderConfigSummary(targetSelector, items);
    }

    function renderOverviewWorldInfo(snapshot) {
        if (!snapshot) {
            $('#gpo-overview-worldinfo').html('<div class="gpo-empty-state">刷新快照后，这里会告诉你本轮命中了多少条世界书，以及主要出口。</div>');
            return;
        }

        const entries = snapshot.worldInfoEntries.slice(0, 4);
        renderWorldInfo('#gpo-overview-worldinfo', entries);
    }

    function renderDiagnosticsPanel(snapshot) {
        const diagnostics = snapshot?.diagnostics || buildDiagnostics(snapshot);
        const html = diagnostics.map((item) => `
            <div class="gpo-diagnostic gpo-diagnostic-${escapeHtml(item.level)}">
                <div class="gpo-diagnostic-title">${escapeHtml(item.title)}</div>
                <div class="gpo-diagnostic-body">${escapeHtml(item.body)}</div>
            </div>
        `).join('');

        $('#gpo-diagnostics-panel').html(`<div class="gpo-diagnostic-list">${html}</div>`);
    }

    function renderAll() {
        const snapshot = state.lastSnapshot;
        if (snapshot) {
            snapshot.configSummary = getCurrentConfigSummary(snapshot);
        }
        $('#gpo-subtitle').text(state.subtitle);
        renderOverviewHero(snapshot);
        renderOverviewComposition(snapshot);
        renderOverviewInsights(snapshot);
        renderOverviewRanking(snapshot);
        renderOverviewConfig(snapshot);
        renderOverviewWorldInfo(snapshot);

        renderConfigSummary('#gpo-config-summary', snapshot?.configSummary || []);
        renderControlOptions();
        renderAdjustPanels(snapshot);
        renderSourceTree(snapshot);
        renderPreview(snapshot);
        renderTokenPanel(snapshot);
        renderWorldbookSummary('#gpo-worldbook-summary-panel');
        renderWorldInfo('#gpo-worldinfo-panel', snapshot?.worldInfoEntries || []);
        renderDiagnosticsPanel(snapshot);

        syncPreviewTab();
        syncDetailTab();
        syncPage();
    }

    function syncPreviewTab() {
        const tabs = ['structure', 'flat', 'messages'];
        tabs.forEach((tab) => {
            $(`.gpo-tab[data-preview-tab="${tab}"]`).toggleClass('is-active', state.previewTab === tab);
            $(`#gpo-preview-${tab}`).toggle(state.previewTab === tab);
        });
    }

    function syncDetailTab() {
        const tabs = ['prompt', 'source', 'token', 'world', 'diagnostics', 'config'];
        tabs.forEach((tab) => {
            const isActive = state.detailTab === tab;
            $(`.gpo-detail-tab[data-detail-tab="${tab}"]`).toggleClass('is-active', isActive);
            $(`.gpo-detail-tab[data-detail-tab="${tab}"]`).attr('aria-selected', isActive ? 'true' : 'false');
            $(`#gpo-detail-panel-${tab}`).toggle(isActive);
        });
    }

    function syncPage() {
        $('.gpo-page-tab').each((_, element) => {
            const isActive = $(element).data('page') === state.page;
            $(element).toggleClass('is-active', isActive);
            $(element).attr('aria-selected', isActive ? 'true' : 'false');
        });
        $('#gpo-overview-page').toggle(state.page === 'overview');
        $('#gpo-detail-page').toggle(state.page === 'detail');
        $('#gpo-adjust-page').toggle(state.page === 'adjust');
    }

    function syncActionMenu() {
        $('#gpo-action-menu').toggle(state.actionMenuOpen);
        $('#gpo-more-actions').attr('aria-expanded', state.actionMenuOpen ? 'true' : 'false');
    }

    function closeActionMenu() {
        state.actionMenuOpen = false;
        syncActionMenu();
    }

    function toggleActionMenu() {
        state.actionMenuOpen = !state.actionMenuOpen;
        syncActionMenu();
    }

    async function refreshSnapshot({ showToast = true } = {}) {
        if (state.refreshing) {
            return;
        }

        state.refreshing = true;
        clearAiSuggestion();
        state.subtitle = '正在做 dry-run，采集当前 prompt 快照…';
        renderAll();

        try {
            state.latestTextPipeline = null;
            state.latestOpenAiChat = null;
            state.latestWorldInfoScan = null;
            await Generate('normal', {}, true);
            state.lastSnapshot = await buildSnapshot();
            state.subtitle = state.lastSnapshot
                ? `快照已更新 · ${state.lastSnapshot.routeLabel}`
                : 'dry-run 已完成，但没有抓到可展示的快照';
            if (showToast) {
                toastr.success('当前 prompt 快照已刷新', '上下文分析');
            }
        } catch (error) {
            console.error(`[${extensionName}] refresh failed`, error);
            state.subtitle = '刷新失败，请看控制台日志';
            if (showToast) {
                toastr.error(`刷新快照失败：${error.message || error}`, '上下文分析');
            }
        } finally {
            state.refreshing = false;
            renderAll();
        }
    }

    function openPopup() {
        state.popupOpen = true;
        state.page = getSettingsRoot().defaultPage || 'overview';
        closeActionMenu();
        $(overlayId).css('display', 'block');
        renderAll();
        void refreshSnapshot({ showToast: false });
    }

    function closePopup() {
        state.popupOpen = false;
        closeActionMenu();
        $(overlayId).hide();
    }

    function ensureFloatingButton() {
        if (!getSettingsRoot().enabled) {
            $(`#${buttonId}`).remove();
            return;
        }

        if ($(`#${buttonId}`).length) {
            return;
        }

        $('body').append(`<div id="${buttonId}" title="上下文分析"><i class="fa-solid fa-chart-pie"></i></div>`);
        const $button = $(`#${buttonId}`);
        const savedPosition = JSON.parse(localStorage.getItem(buttonPositionStorageKey) || 'null');
        if (savedPosition && typeof savedPosition.top === 'string' && typeof savedPosition.left === 'string') {
            $button.css({
                top: savedPosition.top,
                left: savedPosition.left,
                right: 'auto',
                bottom: 'auto',
            });
        }
        makeFloatingButtonDraggable($button);
        $button.on('click', openPopup);
    }

    function makeFloatingButtonDraggable($button) {
        let isDragging = false;
        let wasDragged = false;
        let offsetX = 0;
        let offsetY = 0;

        function getPoint(event) {
            const point = event.touches?.[0] || event;
            return {
                x: point.clientX,
                y: point.clientY,
            };
        }

        function onDragStart(event) {
            const point = getPoint(event);
            const rect = $button[0].getBoundingClientRect();
            isDragging = true;
            wasDragged = false;
            offsetX = point.x - rect.left;
            offsetY = point.y - rect.top;
            $button.css('cursor', 'grabbing');
        }

        function onDragMove(event) {
            if (!isDragging) {
                return;
            }

            wasDragged = true;
            const point = getPoint(event);
            const nextLeft = Math.max(8, Math.min(window.innerWidth - $button.outerWidth() - 8, point.x - offsetX));
            const nextTop = Math.max(8, Math.min(window.innerHeight - $button.outerHeight() - 8, point.y - offsetY));
            $button.css({
                left: `${nextLeft}px`,
                top: `${nextTop}px`,
                right: 'auto',
                bottom: 'auto',
            });
            if (event.cancelable) {
                event.preventDefault();
            }
        }

        function onDragEnd() {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            $button.css('cursor', 'pointer');
            const top = $button.css('top');
            const left = $button.css('left');
            localStorage.setItem(buttonPositionStorageKey, JSON.stringify({ top, left }));
            setTimeout(() => {
                wasDragged = false;
            }, 0);
        }

        $button.off('mousedown.gpo touchstart.gpo click.gpo');
        $(document).off('mousemove.gpo touchmove.gpo mouseup.gpo touchend.gpo');

        $button.on('mousedown.gpo touchstart.gpo', onDragStart);
        $(document).on('mousemove.gpo touchmove.gpo', onDragMove);
        $(document).on('mouseup.gpo touchend.gpo', onDragEnd);
        $button.on('click.gpo', function (event) {
            if (wasDragged) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        });
    }

    function handleBeforeCombinePrompts(data) {
        if (state.runtimeCaptureMuted) {
            return;
        }

        state.latestTextPipeline = {
            storyString: data.storyString || '',
            worldInfoBefore: data.worldInfoBefore || '',
            worldInfoAfter: data.worldInfoAfter || '',
            worldInfoString: `${data.worldInfoBefore || ''}${data.worldInfoAfter || ''}`,
            examplesString: data.mesExmString || '',
            mesExmString: data.mesExmString || '',
            mesSendString: data.mesSendString || '',
            generatedPromptCache: data.generatedPromptCache || '',
            description: data.description || '',
            personality: data.personality || '',
            persona: data.persona || '',
            scenario: data.scenario || '',
            main: data.main || '',
            jailbreak: data.jailbreak || '',
            naiPreamble: data.naiPreamble || '',
            beforeScenarioAnchor: data.beforeScenarioAnchor || '',
            afterScenarioAnchor: data.afterScenarioAnchor || '',
            promptBias: '',
            finalPrompt: '',
            this_max_context: Number(data.this_max_context || 0),
        };
    }

    function handleAfterCombinePrompts(data) {
        if (state.runtimeCaptureMuted) {
            return;
        }

        if (main_api === 'openai') {
            return;
        }

        state.latestTextPipeline = Object.assign({}, state.latestTextPipeline || {}, {
            finalPrompt: typeof data.prompt === 'string' ? data.prompt : '',
        });

        if (state.popupOpen) {
            void buildSnapshot().then((snapshot) => {
                state.lastSnapshot = snapshot;
                state.subtitle = `快照已更新 · ${snapshot.routeLabel}`;
                renderAll();
            });
        }
    }

    function handleChatCompletionPromptReady(eventData) {
        if (state.runtimeCaptureMuted) {
            return;
        }

        state.latestOpenAiChat = Array.isArray(eventData?.chat) ? eventData.chat : [];
        if (state.popupOpen) {
            void buildSnapshot().then((snapshot) => {
                state.lastSnapshot = snapshot;
                state.subtitle = `快照已更新 · ${snapshot.routeLabel}`;
                renderAll();
            });
        }
    }

    function handleWorldInfoScanDone(scanArgs) {
        if (state.runtimeCaptureMuted) {
            return;
        }

        const activatedEntries = Array.from(scanArgs?.activated?.entries?.values?.() || []);
        state.latestWorldInfoScan = {
            activatedEntries,
            text: scanArgs?.activated?.text || '',
            overflowed: !!scanArgs?.budget?.overflowed,
            budget: Number(scanArgs?.budget?.current || 0),
        };
    }

    function handleWorldInfoActivated(entries) {
        if (state.runtimeCaptureMuted) {
            return;
        }

        state.latestWorldInfoActivated = Array.isArray(entries) ? entries : [];
    }

    function jumpToTarget(target) {
        const targetMap = {
            preset: { page: 'adjust', selector: '#gpo-adjust-preset-section' },
            worldbook: { page: 'adjust', selector: '#gpo-adjust-worldbook-section' },
            'detail-source': { page: 'detail', detailTab: 'source', selector: '#gpo-source-tree' },
            'detail-preview': { page: 'detail', detailTab: 'prompt', selector: '#gpo-preview-structure' },
            'detail-worldinfo': { page: 'detail', detailTab: 'world', selector: '#gpo-worldbook-summary-panel' },
            'detail-config': { page: 'detail', detailTab: 'config', selector: '#gpo-config-summary' },
        };
        const destination = targetMap[String(target || '')] || targetMap['detail-source'];
        state.page = destination.page;
        if (destination.detailTab) {
            state.detailTab = destination.detailTab;
        }
        setSettings({ defaultPage: state.page });
        renderAll();

        requestAnimationFrame(() => {
            const element = document.querySelector(destination.selector);
            if (!element) {
                return;
            }

            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.classList.add('gpo-panel-pulse');
            window.setTimeout(() => element.classList.remove('gpo-panel-pulse'), 1200);
        });
    }

    function bindDomEvents() {
        $('#gpo-enabled-toggle').prop('checked', !!getSettingsRoot().enabled);
        $('#gpo-enabled-toggle').on('change', function () {
            setSettings({ enabled: !!$(this).prop('checked') });
            ensureFloatingButton();
        });

        $('#gpo-open-manager').on('click', openPopup);
        $('#gpo-check-update').on('click', async () => {
            if ($('#gpo-update-guide').is(':visible')) {
                await Updater.performUpdate();
                return;
            }

            await Updater.checkForUpdates(true);
        });
        $('#gpo-refresh-from-settings').on('click', () => void refreshSnapshot());
        $('#gpo-refresh').on('click', () => void refreshSnapshot());
        $('#gpo-refresh-menu').on('click', () => {
            closeActionMenu();
            void refreshSnapshot();
        });
        $('#gpo-close-popup').on('click', closePopup);
        $('#gpo-more-actions').on('click', function (event) {
            event.stopPropagation();
            toggleActionMenu();
        });

        $(overlayId).on('click', function (event) {
            if (event.target === this) {
                closePopup();
            }
        });
        $(popupId).on('click', (event) => {
            if (!$(event.target).closest('.gpo-action-menu-shell').length) {
                closeActionMenu();
            }
            event.stopPropagation();
        });

        $(popupId).on('click', '.gpo-page-tab', function () {
            state.page = String($(this).data('page') || 'overview');
            setSettings({ defaultPage: state.page });
            syncPage();
        });

        $(popupId).on('click', '.gpo-tab', function () {
            state.previewTab = String($(this).data('preview-tab') || 'structure');
            syncPreviewTab();
        });

        $(popupId).on('click', '.gpo-detail-tab', function () {
            state.detailTab = String($(this).data('detail-tab') || 'prompt');
            syncDetailTab();
        });

        $(popupId).on('click', '.gpo-jump-button', function () {
            const target = String($(this).data('jump-target') || 'detail-source');
            jumpToTarget(target);
        });

        $(document).on('change', '#gpo-preset-select', function () {
            const value = String($(this).val() || '');
            const manager = getPresetManager(main_api);
            if (!manager || !value) {
                return;
            }

            manager.selectPreset(value);
            clearAiSuggestion();
            state.subtitle = '已切换预设，请按需刷新快照';
            renderAll();
        });

        $(document).on('change', '#gpo-adjust-preset-select', function () {
            $('#gpo-preset-select').val($(this).val()).trigger('change');
        });

        $(document).on('change', '#gpo-adjust-worldbook-multiselect', function () {
            const values = $(this).val();
            $('#world_info').val(values).trigger('change');
            clearAiSuggestion();
            state.subtitle = '已更新全局世界书启用集，请按需刷新快照';
            renderAll();
        });

        $(popupId).on('click touchend', '#gpo-generate-ai-suggestion', function (event) {
            event.preventDefault();
            event.stopPropagation();
            void requestAiSuggestion();
        });

        $('#gpo-export-snapshot').on('click', () => {
            closeActionMenu();
            if (!state.lastSnapshot) {
                toastr.warning('还没有可导出的快照', '上下文分析');
                return;
            }

            const payload = {
                exportedAt: formatDateTime(new Date()),
                route: state.lastSnapshot.route,
                routeLabel: state.lastSnapshot.routeLabel,
                configSummary: state.lastSnapshot.configSummary,
                tokenBudget: state.lastSnapshot.tokenBudget,
                totalTokens: state.lastSnapshot.totalTokens,
                tokenRows: state.lastSnapshot.tokenRows,
                sourceNodes: state.lastSnapshot.sourceNodes,
                flatPrompt: state.lastSnapshot.flatPrompt,
                messageArray: state.lastSnapshot.messageArray,
                worldInfoEntries: state.lastSnapshot.worldInfoEntries,
                diagnostics: state.lastSnapshot.diagnostics || [],
                ruleRecommendations: state.lastSnapshot.ruleRecommendations || [],
                aiSuggestion: state.aiSuggestion,
            };

            download(
                JSON.stringify(payload, null, 2),
                `global-prompt-snapshot-${Date.now()}.json`,
                'application/json',
            );
        });

        $('#gpo-copy-prompt').on('click', async () => {
            closeActionMenu();
            const text = state.lastSnapshot?.flatPrompt || '';
            if (!text) {
                toastr.warning('当前没有可复制的最终内容', '上下文分析');
                return;
            }

            try {
                await navigator.clipboard.writeText(text);
                toastr.success('最终内容已复制到剪贴板', '上下文分析');
            } catch (error) {
                toastr.error(`复制失败：${error.message || error}`, '上下文分析');
            }
        });
    }

    function bindRuntimeEvents() {
        eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, handleBeforeCombinePrompts);
        eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, handleAfterCombinePrompts);
        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, handleChatCompletionPromptReady);
        eventSource.on(event_types.WORLDINFO_SCAN_DONE, handleWorldInfoScanDone);
        eventSource.on(event_types.WORLD_INFO_ACTIVATED, handleWorldInfoActivated);
        eventSource.on(event_types.CHAT_CHANGED, async () => {
            clearAiSuggestion();
            state.lastSnapshot = await buildSnapshot();
            state.subtitle = state.lastSnapshot ? `快照已同步 · ${state.lastSnapshot.routeLabel}` : '切换聊天后暂无快照';
            renderAll();
        });
        eventSource.on(event_types.MAIN_API_CHANGED, async () => {
            clearAiSuggestion();
            state.lastSnapshot = await buildSnapshot();
            state.subtitle = `当前接口已切换为 ${main_api === 'openai' ? '聊天接口（OpenAI）' : '文本接口（非 OpenAI）'}`;
            renderAll();
        });
        eventSource.on(event_types.SETTINGS_UPDATED, renderAll);
    }

    async function injectUi() {
        if (!$('#gpo-settings-panel').length) {
            const settingsHtml = await fetchAssetText('settings.html');
            $('#extensions_settings2').append(settingsHtml);
        }

        if (!$(overlayId).length) {
            const popupHtml = await fetchAssetText('popup.html');
            $('body').append(popupHtml);
        }
    }

    try {
        await injectUi();
        bindDomEvents();
        bindRuntimeEvents();
        ensureFloatingButton();
        await Updater.checkForUpdates(false);
        state.page = getSettingsRoot().defaultPage || 'overview';
        state.lastSnapshot = await buildSnapshot();
        state.subtitle = state.lastSnapshot ? `已加载缓存快照 · ${state.lastSnapshot.routeLabel}` : '等待你刷新当前快照';
        renderAll();
    } catch (error) {
        console.error(`[${extensionName}] init failed`, error);
        toastr.error(`上下文分析加载失败：${error.message || error}`, '上下文分析');
    }
});
