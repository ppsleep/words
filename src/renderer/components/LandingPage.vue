<template>
    <div class="page-main">
        <i-menu mode="horizontal" theme="dark" width="auto" @on-select="menu" style="-webkit-app-region: drag">
            <Menu-item name="dashboard"><Icon type="ios-speedometer" size="16"></Icon> Dashboard</Menu-item>
            <Menu-item name="mark"><Icon type="ios-bookmarks" size="16"></Icon> 添加生词</Menu-item>
        </i-menu>
        <div v-if="view.dashboard" class="result">
            <div class="start-btn" v-if="!question.start">
                <Button type="primary" icon="ios-checkmark" @click="start()" long>开始练习</Button>
            </div>
            <div v-if="question.ready">
                <h2 class="margin-t-20">Question：</h2>
                <div class="explains">
                <p v-for="item in question.explains">{{ item }}</p>
                <p v-if="question.phonetic">
                    <Row>
                        <i-col span="12">
                            <i-col span="3">
                                <Button v-bind:type="question.uk_speech ? 'primary' : 'ghost'" shape="circle" size="small" icon="volume-medium" @click="playVoice('q-uk-speech')"></Button>
                                <audio id="q-uk-speech" v-bind:src="question.uk_speech"></audio>
                            </i-col>
                            <i-col span="20">
                                英  [{{ question.uk_phonetic }}]
                            </i-col>
                        </i-col>
                        <i-col span="12">
                            <i-col span="3">
                                <Button v-bind:type="question.us_speech ? 'primary' : 'ghost'" shape="circle" size="small" icon="volume-medium" @click="playVoice('q-us-speech')"></Button>
                                <audio id="q-us-speech" v-bind:src="question.us_speech"></audio>
                            </i-col>
                            <i-col span="20">
                                美  [{{ question.us_phonetic }}]
                            </i-col>
                        </i-col>
                    </Row>
                </p>
                <h3 v-if="question.showAnswer">答案：{{ question.answer }}</h3>
                </div>
                <i-form @submit.native.prevent="answerSubmit()">
                    <Row :gutter="6">
                    <div class="margin-t-20">
                        <i-col span="16">
                            <FormItem>
                                <Input type="text" style="" v-model="question.input" placeholder="请输入答案" size="large"></Input>
                            </FormItem>
                        </i-col>
                        <i-col span="2">
                            <FormItem>
                                <Tooltip content="验证答案" placement="top">
                                <Button type="primary" shape="circle" icon="checkmark" size="large" class="search-btn" @click="answerSubmit()"></Button>
                                </Tooltip>
                            </FormItem>
                        </i-col>
                        <i-col span="2">
                            <FormItem>
                                <Tooltip content="提示音标" placement="top">
                                <Button type="success" shape="circle" icon="help" size="large" class="search-btn" @click="answerTip()"></Button>
                                </Tooltip>
                            </FormItem>
                        </i-col>
                        <i-col span="2">
                            <FormItem>
                                <Tooltip content="不记得了" placement="top">
                                <Button type="error" shape="circle" icon="close" size="large" class="search-btn" @click="forget()"></Button>
                                </Tooltip>
                            </FormItem>
                        </i-col>
                    </div>
                    </Row>
                </i-form>
            </div>
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
            <div v-if="view.result" class="result">
                <h2>{{ trans.query }}</h2>
                <p>
                    <Row>
                        <i-col span="12">
                            <i-col span="3">
                                <Button v-bind:type="trans.uk_speech ? 'primary' : 'ghost'" shape="circle" size="small" icon="volume-medium" @click="getVoice('uk_speech')"></Button>
                                <audio id="uk_speech" v-bind:src="trans.uk_speech"></audio>
                                <div class="load-speech" v-if="voice.uk_speech">
                                    <Spin fix><Icon type="load-c" size="30" class="demo-spin-icon-load"></Icon></Spin>
                                </div>
                            </i-col>
                            <i-col span="20">
                                英  [{{ trans.uk_phonetic }}]
                            </i-col>
                        </i-col>
                        <i-col span="12">
                            <i-col span="3">
                                <Button v-bind:type="trans.us_speech ? 'primary' : 'ghost'" shape="circle" size="small" icon="volume-medium" @click="getVoice('us_speech')"></Button>
                                <audio id="us_speech" v-bind:src="trans.us_speech"></audio>
                                <div class="load-speech" v-if="voice.us_speech">
                                    <Spin fix><Icon type="load-c" size="30" class="demo-spin-icon-load"></Icon></Spin>
                                </div>
                            </i-col>
                            <i-col span="20">
                                美  [{{ trans.us_phonetic }}]
                            </i-col>
                        </i-col>
                    </Row>
                </p>
                <div class="explains">
                <p v-for="item in trans.explains">{{ item }}</p>
                </div>
                <Row>
                    <i-col span="22">
                        <Poptip confirm title="确定要删除吗？" @on-ok="delWords">
                        <Button type="error" :disabled="trans.deleted" v-if="trans.exist" class="sub-add" icon="trash-a">删除</Button>
                        </Poptip>
                        <div class="sub-btn-group">
                        <Button type="primary" :disabled="trans.exist" class="sub-add" icon="plus-circled" @click="addWords()">{{ trans.btn }}</Button>
                        </div>
                    </i-col>
                </Row>
            </div>
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
                        { required: true, pattern: /^[a-zA-Z]+((-| )[a-zA-Z]+)?$/, message: '请输入要查询的单词，只支持英文单词', trigger: 'blur' },
                    ],
                },
                view: {
                    dashboard: true,
                    mark: false,
                    result: false,
                },
                trans: {
                    exist: false,
                    deleted: false,
                    btn: '添加到生词本',
                    query: '',
                    us_phonetic: '',
                    uk_phonetic: '',
                    us_speech: '',
                    uk_speech: '',
                    explains: [],
                    data: '',
                },
                voice: {
                    us_speech: false,
                    uk_speech: false,
                },
                question: {
                    start: false,
                    explains: [],
                    phonetic: false,
                    us_phonetic: '',
                    uk_phonetic: '',
                    us_speech: '',
                    uk_speech: '',
                    answer: '',
                    input: '',
                    showAnswer: false,
                    ready: false,
                },
                onsubmit: false,
                interval: null,
            }
        },
        watch: {
            'formInline.word': function (newVal, oldVal) {
                this.trans.exist = false;
                this.trans.btn = '添加到生词本';
                this.trans.query = '';
                this.trans.us_phonetic = '';
                this.trans.uk_phonetic = '';
                this.trans.us_speech = '';
                this.trans.uk_speech = '';
                this.trans.explains = [];
                this.trans.data = '';
                this.voice.us_speech= false,
                this.voice.uk_speech= false,
                this.view.result = false;
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
                        this.interval = setTimeout(this.checkNet, 30000);
                    } else {
                        this.$Message.error('请输入正确的单词');
                    }
                })
            },
            getVoice(id) {
                if (this.trans[id] !== '') {
                    document.getElementById(id).play()
                } else {
                    this.$electron.ipcRenderer.send('get-voice', this.trans.data)
                }
            },
            playVoice(id) {
                if (this.question[id] !== '') {
                    var playPromise = document.getElementById(id).play();
                    /*
                    if (playPromise !== undefined) {
                        playPromise.then(_ => {
                            document.getElementById(id).pause();
                        })
                        .catch(error => {
                            console.log(error)
                        });
                    }
                    */
                }
            },
            addWords() {
                if (!this.trans.data) {
                    this.$Message.error('请求错误，请尝试重新查询');
                } else {
                    this.$electron.ipcRenderer.send('add-word', this.trans.data);
                }
            },
            delWords() {
                this.$electron.ipcRenderer.send('del-word', this.trans.data.id);
            },
            checkNet() {
                this.$Message.error('请求超时，请检查网络连接');
                this.onsubmit = false;
            },
            start() {
                this.question.start = true;
                this.question.input = '';
                this.question.phonetic = false;
                this.question.showAnswer = false;
                this.$electron.ipcRenderer.send('get-question');
            },
            answerSubmit() {
                if (this.question.input === this.question.answer) {
                    this.checkAnswer(this.question.answer, 'right');
                    var vm = this;
                    this.$Message.success({
                        content: '回答正确，加十分！',
                        onClose: function (){
                            vm.start();
                        }
                    });
                    return;
                }
                this.checkAnswer(this.question.answer, 'error');
                this.$Message.error('啊哦~ 回答错误~');
            },
            answerTip() {
                this.question.phonetic = true;
                this.checkAnswer(this.question.answer, 'help');
            },
            forget() {
                this.question.showAnswer = true;
                this.checkAnswer(this.question.answer, 'forget');
            },
            checkAnswer(word, result){
                this.$electron.ipcRenderer.send('question-update', {word: word, result: result});
            },
        },
        mounted () {
            this.$electron.ipcRenderer.on('query-result', (event, arg) => {
                if (arg.status === 0) {
                    this.trans.data = arg;
                    this.trans.query = arg.word;
                    this.trans.us_phonetic = arg.us_phonetic;
                    this.trans.uk_phonetic = arg.uk_phonetic;
                    this.trans.explains = arg.explains;
                    this.trans.exist = arg.exist;
                    if (arg.exist) {
                        this.trans.us_speech = arg.us_speech;
                        this.trans.uk_speech = arg.uk_speech;
                        this.trans.btn = '生词本已存在';
                    } else {
                        this.trans.btn = '添加到生词本';
                    }
                    this.view.result = true;
                } else if (arg.status === 1) {
                    this.$Message.error(arg.msg);
                }
                clearInterval(this.interval);
                this.onsubmit = false;
            });
            this.$electron.ipcRenderer.on('voice-result', (event, arg) => {
                if (arg.voice === 'us') {
                    this.trans.us_speech = arg.file;
                    this.trans.data.us_speech = arg.file;
                } else if (arg.voice === 'uk') {
                    this.trans.data.uk_speech = arg.file;
                    this.trans.uk_speech = arg.file;
                }
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
            this.$electron.ipcRenderer.on('del-result', (event, arg) => {
                this.$Message.success("删除成功");
                this.trans.deleted = true;
            });
            this.$electron.ipcRenderer.on('question-result', (event, arg) => {
                if (arg.status === 1) {
                    this.$Message.error('诶？你好像还没有添加生词~');
                    this.question.start = false;
                } else {
                    this.question.explains = arg.explains;
                    this.question.us_phonetic = arg.us_phonetic;
                    this.question.uk_phonetic = arg.uk_phonetic;
                    this.question.us_speech = arg.us_speech;
                    this.question.uk_speech = arg.uk_speech;
                    this.question.answer = arg.word;
                    this.question.ready = true;
                }
            });
        },
    }

</script>

