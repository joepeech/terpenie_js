const MAX_MEDIA_SIZE_KB = 2 * 1024;
var srcBoard = "";
var patientBoard = "";
var srcThId = 0;
var patientThId = 0;
var firstPost = 1; // ignore op post


const getThread = async (brd, id) => await fetch(`https://2ch.hk/${brd}/res/${id}.json`).then(c => c.json());

const processAndAttachImages = async files => {
    let dt = new DataTransfer();
    for (let fileInfo of files) {
        let ref = (fileInfo.size > MAX_MEDIA_SIZE_KB ? fileInfo.thumbnail : fileInfo.path); // size in kb
        let blob = await fetch(ref).then(r => r.blob());
        dt.items.add(new File([blob], fileInfo.fullname, {type: blob.type}));
    }
    FormFiles.addMultiFiles(dt.files);
}


const reversePost = html => {
    const fold = (tag, inner) => `[${tag}]${inner}[/${tag}]`;
    let result = [];
    for (let e of $.parseHTML(html)) {
        if (e.innerHTML === undefined) {
            result.push(e.data);
            continue;
        }

        let txt = e.innerHTML;
        switch (e.tagName && e.tagName.toLowerCase()) {
            case 'br':     txt = "\n"; break;
            case 'strong': txt = fold('b', reversePost(txt)); break;
            case 'em':     txt = fold('i', reversePost(txt)); break;
            case 'sup':    txt = fold('sup', reversePost(txt)); break;
            case 'sub':    txt = fold('sub', reversePost(txt)); break;
            case 'a':  
                if (e.className === "post-reply-link") {
                    txt = '>>' + e.getAttribute('data-num');
                    break;
                }
                txt = reversePost(e.href);
                break;
            case 'span': switch (e.className) {
                case 's': txt = fold('s', reversePost(txt)); break;
                case 'u': txt = fold('u', reversePost(txt)); break;
                case 'o': txt = fold('o', reversePost(txt)); break;
                case 'spoiler': txt = fold('spoiler', reversePost(txt)); break;
                case 'unkfunc': txt = reversePost(txt); // '>' in txt as '&gt;'
            }
        }

        result.push(txt);
    }
    return result.join('');
}

const substitudePostIds = (text, tab) => text.replace(/>>(\d+)/g, (_, replyId) => ">>" + tab[replyId]);

const getMyLastPostId = (brd, thId) => {
    let s = JSON.parse(localStorage.store);
    s.myposts ||= [];
    s.myposts[brd] ||= [];
    s.myposts[brd][thId] ||= [];
    return s.myposts[brd][thId].slice(-1)[0];
}

let json = await getThread(srcBoard, srcThId);
let posts = json.threads[0].posts;


let postTab = {};
postTab[srcThId] = patientThId; // ignore op post

const endurance = () => {
    let i = firstPost;
    let prevId = patientThId;

    return () => {
        let srcId = posts[i].num;
        postTab[prevId] = getMyLastPostId(patientBoard, patientThId);
        prevId = srcId;

        let text = reversePost(posts[i].comment);
        text = substitudePostIds(text, postTab);

        if (posts[i].files) {
            processAndAttachImages(posts[i].files);
        }

        $("#shampoo").val(text);
        i++;
    }
}

$(document).ready(function () {
    const button_html = '<button type="button" class="endure button desktop">терпение.js</button>';
    $(".postform").each(function () {
        $(this).children(".postform__raw").first().append(button_html);
    });
    $(".endure").click(endurance());
});
