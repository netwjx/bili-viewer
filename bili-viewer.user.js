// ==UserScript==
// @name         bili-viewer
// @namespace    bili-viewer
// @version      1.0
// @description  b站大屏视频下饭
// @author       netwjx
// @match        https://www.bilibili.com/
// @updateURL    https://raw.githubusercontent.com/netwjx/bili-viewer/main/bili-viewer.user.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// 
// ==/UserScript==

(async function() {
    'use strict';
    GM_addStyle(`
        #bili-viewer {
            height: 100vh;
            display: flex;
            flex-dir: column;
            overflow: hidden;
        }
        #bili-viewer-btns {
            position: fixed;
            right: 0;
            top: 35%;
            display: flex;
            width: 40px;
            flex-direction: column;
        }
        #bili-viewer button{
            opacity: .3;
            padding: 10px;
            background: white;
        }
        #bili-viewer button:hover{
            opacity: 1;
        }
        .palette-button-wrap {
            opacity: .1;
        }
        #bili-viewer ol {
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            width: calc(100vw);
            min-width: calc(100vw);
            padding-right: 13px;
        }
        #bili-viewer li {
            width: calc(50vw - 30px);
            height: 20vh;
            overflow: hidden;
        }
        #bili-viewer li:hover {
            background: #eeeeee;
        }
        #bili-viewer img {
            float: left;
            height: 20vh;
        }
        #bili-viewer .title {
            display: block;
            font-size: 1.5em;
            margin-left: 256px;
            margin-bottom: 0.6em;
        }
        #bili-viewer .title:hover {
            background: white;
        }
        #bili-viewer .sub span {
            display: inline-block;
            text-align: right;
        }
        #bili-viewer .sub button {
            float: right;
            margin-right: 10px
        }
    `)
    let main = document.getElementById('i_cecream')
    main.addEventListener('dblclick', () => {
        localStorage.removeItem('biliViewerDisabled')
        location.reload()
    })
    if (localStorage.biliViewerDisabled) {
        return
    }
    main.style.cssText = 'display: none'
    let cont = document.createElement('div')
    cont.id = 'bili-viewer'
    let readme = `
        asdfghjkl;: 稍后再看
        空格/shift+空格: 下一页/上一页
        w/shift+w: 立即去观看/稍后再看列表
        r: 返回首页
    `.replace(/^\s+/mg, '').replace(/\n/g, '&#13;')
    cont.innerHTML = `<div id="bili-viewer-btns">
        <button class="returnHome">返回首页</button>
        <button class="prev">上一页</button>
        <button class="next">下一页</button>
        <input class="input" placeholder="说明" title="${readme}">
    </div>`
    let list
    let keys = 'asdfghjkl;'.split('')

    function input(e){
        let k = keys.indexOf(e.key)
        if(k >= 0) {
            let i = cont.scrollLeft / list.clientWidth
            let later = cont.children[i + 1].children[k].querySelector('.later')
            later.click()
        } else if(e.key === ' ') {
            if(e.shiftKey) {
                prev()
            }else {
                next()
            }
        } else if (e.key === 'w') {
            window.open(e.shiftKey ?
                'https://www.bilibili.com/watchlater/#/list':
                'https://www.bilibili.com/medialist/play/watchlater'
            )
        } else if (e.key === 'r') {
            returnHome()
        }
        input.ele.value = ''
    }
    input.type = 'keypress'
    document.body.addEventListener('click', () => cont.querySelector('.input').focus())

    function prev(){
        if(list) {
            cont.scrollBy(-list.clientWidth, 0)
        }
    }
    function next(){
        if (cont.scrollLeft < cont.scrollWidth - list.clientWidth) {
            cont.scrollBy(list.clientWidth, 0)
        } else {
            render()
            if(main) {
                main = null
                document.querySelectorAll(`#${cont.id} ~ *`).forEach(e => e.remove());
            }
        }
    }
    function returnHome(){
        localStorage.biliViewerDisabled = 1
        cont.remove();
        if(main) {
            main.style.cssText = ''
        }else {
            location.reload()
        }
    }

    Object.entries({ returnHome, next, prev, input }).forEach(([cls, cb]) => {
        let ele = cont.querySelector('.' + cls)
        cb.ele = ele
        ele.addEventListener(cb.type || 'click', cb)
    })

    document.body.prepend(cont)
    document.body.click()
    

    let data = load()
    let loading = false;
    async function load(){
        if (loading) {
            return data;
        }
        loading = true
        try {
            let res = await fetch("https://api.bilibili.com/x/web-interface/index/top/rcmd?fresh_type=3&version=1&ps=10&fresh_idx=1&fresh_idx_1h=1&homepage_ver=1", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                },
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            })
            let { data: { item } } = await res.json()
            return item
        } finally {
            loading = false
        }
    }
    render()
    async function render(){
        list = document.createElement('ol')
        list.innerHTML = (await data.catch(() => load()))
            .map(({ pic, title, owner: { name }, duration, id, rcmd_reason, stat: { view, like, danmaku }, uri},  i) => {
                return `<li>
                    <img src="${pic}@506w_316h_1c.webp">
                    <a class="title" href="${uri}">${keys[i]}. ${title}</a>
                    <div class="sub">
                        <span style="width:70px">${rcmd_reason && rcmd_reason.content || ''}</span>
                        <span style="width:60px">${view}</span>
                        <span style="width:50px">${like}</span>
                        <span style="width:40px">${danmaku}</span>
                        <span stlye="width:50px">${duration/60|0}:${duration%60}</span>
                    </div>
                    <div class="sub">
                        <span style="text-indent:100px;">@${name}</span>
                        <button class="later" data-id="${id}">稍后再看</button>
                    </div>
                </li>`
            }).join('')
        cont.append(list)
        list.querySelectorAll('.later').forEach(later => {
            later.addEventListener('click', async () => {
                let body = new FormData()
                body.append('aid', later.getAttribute('data-id'))
                body.append('csrf', /bili_jct=(.+?);/.exec(document.cookie)[1])

                later.style.cssText = 'font-weight: bold; color: red'
                let res = await fetch("https://api.bilibili.com/x/v2/history/toview/add", {
                    "body": body,
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include"
                });
                let { code, message } = await res.json()
                later.innerHTML = {
                    0: '已加入',
                    90001: '稍后再看已满100条，shift+w去清理',
                }[code] || message
            })
        })
        cont.scrollBy(list.clientWidth, 0)
        data = load()
    }
})();