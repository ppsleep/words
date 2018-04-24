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
        <div v-if="view.transok" class="result">
            <h2>good</h2>
            <p>
                <Row>
                    <i-col span="12">
                    <Button type="primary" shape="circle" size="small" icon="volume-medium"></Button> 英  ['fɔːmæt]
                    </i-col>
                    <i-col span="12">
                    <Button type="primary" shape="circle" size="small" icon="volume-medium"></Button> 美  ['fɔːmæt]
                    </i-col>
                </Row>
            </p>
            <div class="explains">
            <p>n. 格式；版式；开本</p>
            <p>n. 格式；版式；开本</p>
            </div>
            <Row>
                <i-col span="22">
                    <Button type="primary" class="sub-add" icon="plus-circled">确认添加到生词本</Button>
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
                    transok: true,
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
                console.log(this.x, this.$x)
                this.$refs[name].validate((valid) => {
                    if (valid) {
                        this.onsubmit = true;
                        this.$electron.ipcRenderer.send('add-word', this.formInline.word)
                        this.interval = setTimeout(this.checkNet, 8000);
                        //this.$Message.success('Success!');
                    } else {
                        this.$Message.error('Fail!');
                    }
                })
            },
            checkNet() {
                this.$Message.error('请求超时，请检查网络连接');
                this.onsubmit = false;
            },
        },
        mounted () {
            this.$electron.ipcRenderer.on('add-result', (event, arg) => {
                var msg = this.$Message;
                if (arg.status === 0) {
                    
                } else if (arg.status === 1) {
                    msg.error(arg.msg);
                }
                clearInterval(this.interval)
                this.onsubmit = false;
            });
        },
    }
</script>

