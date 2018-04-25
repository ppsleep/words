<template>
    <div class="page-main">
        <i-menu mode="horizontal" theme="dark" width="auto" @on-select="menu" style="-webkit-app-region: drag">
            <Menu-item name="dashboard"><Icon type="ios-speedometer"></Icon> Dashboard</Menu-item>
            <Menu-item name="mark"><Icon type="ios-bookmarks"></Icon> 添加生词</Menu-item>
        </i-menu>
        <div v-if="view.dashboard">
        </div>
        <div v-if="view.mark">
            <i-form ref="formInline" :model="formInline" :rules="ruleInline" @submit.native.prevent="handleSubmit('formInline')">
                <Row>
                <div class="add-word">
                    <i-col span="20">
                        <FormItem prop="word">
                            <Input type="text" style="" v-model="formInline.word" placeholder="请输入生词" size="large"></Input>
                        </FormItem>
                    </i-col>
                    <i-col span="2">
                        <FormItem>
                            <Button type="primary" shape="circle" icon="ios-search" size="large" class="search-btn" @click="handleSubmit('formInline')"></Button>
                        </FormItem>
                    </i-col>
                </div>
                </Row>
            </i-form>
        </div>
        <div v-if="view.result" class="result">
            <h2>{{ trans.query }}</h2>
            <p>
                <Row>
                    <i-col span="12">
                    <Button type="primary" shape="circle" size="small" icon="volume-medium" @click="voice('uk-speech')"></Button> 英  [{{ trans.uk_phonetic }}]
                    <audio id="uk-speech" v-bind:src="trans.uk_speech"></audio>
                    </i-col>
                    <i-col span="12">
                    <Button type="primary" shape="circle" size="small" icon="volume-medium" @click="voice('us-speech')"></Button> 美  [{{ trans.us_phonetic }}]
                    <audio id="us-speech" v-bind:src="trans.us_speech"></audio>
                    </i-col>
                </Row>
            </p>
            <div class="explains">
            <p v-for="item in trans.explains">{{ item }}</p>
            </div>
            <Row>
                <i-col span="22">
                    <Button type="primary" :disabled="trans.exist" class="sub-add" icon="plus-circled" @click="addWords()">{{ trans.btn }}</Button>
                </i-col>
            </Row>
        </div>
        <Spin fix size="large" v-if="onsubmit"></Spin>
    </div>
</template>
<script>
    export default {
        data () {
            return {
                formInline: {
                    word: '',
                },
                ruleInline: {
                    word: [
                        { required: true, pattern: /^[a-zA-Z]+(-[a-zA-Z]+)?$/, message: '请输入要查询的单词，只支持英文单词', trigger: 'blur' },
                    ],
                },
                view: {
                    dashboard: false,
                    mark: true,
                    result: false,
                },
                trans: {
                    exist: false,
                    btn: '添加到生词本',
                    query: '',
                    us_phonetic: '',
                    uk_phonetic: '',
                    us_speech: '',
                    uk_speech: '',
                    explains: [],
                    data: '',
                },
                onsubmit: false,
                interval: null,
            }
        },
        methods: {
            menu(name) {
                for (var i in this.view) {
                    this.view[i] = false;
                }
                this.view[name] = true;
            },
            handleSubmit(name) {
                this.$refs[name].validate((valid) => {
                    if (valid) {
                        this.onsubmit = true;
                        this.$electron.ipcRenderer.send('query-word', this.formInline.word)
                        this.interval = setTimeout(this.checkNet, 8000);
                    } else {
                        this.$Message.error('请输入正确的单词');
                    }
                })
            },
            voice(id) {
                document.getElementById(id).play()
            },
            addWords() {
                if (!this.trans.data) {
                    this.$Message.error('请求错误，请尝试重新查询');
                } else {
                    this.$electron.ipcRenderer.send('add-word', this.trans.data)
                }
            },
            checkNet() {
                this.$Message.error('请求超时，请检查网络连接');
                this.onsubmit = false;
            },
        },
        mounted () {
            this.$electron.ipcRenderer.on('query-result', (event, arg) => {
                if (arg.status === 0) {
                    this.trans.data = arg;
                    this.trans.query = arg.word;
                    this.trans.us_phonetic = arg.us_phonetic;
                    this.trans.uk_phonetic = arg.uk_phonetic;
                    this.trans.us_speech = arg.us_speech;
                    this.trans.uk_speech = arg.uk_speech;
                    this.trans.explains = arg.explains;
                    this.trans.exist = arg.exist;
                    if (arg.exist) {
                        this.trans.btn = '生词本已存在';
                    } else {
                        this.trans.btn = '添加到生词本';
                    }
                    this.view.result = true;
                } else if (arg.status === 1) {
                    this.$Message.error(arg.msg);
                }
                clearInterval(this.interval)
                this.onsubmit = false;
            });
            this.$electron.ipcRenderer.on('add-result', (event, arg) => {
                if (arg.status === 0) {
                    this.$Message.success(arg.msg);
                    this.trans.exist = true;
                } else {
                    this.$Message.error(arg.msg);
                    this.trans.exist = false;
                }
            });
        },
    }
</script>

