var baseUrl = 'http://elite.nju.edu.cn/jiaowu/student/studentinfo/achievementinfo.do?method=searchTermList';
var data = {};
var selectedTerm = {};

function getTermGrade(termCode) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: baseUrl + "&termCode=" + termCode,
            async: true,
            success: function(res) {
                var termData = [];
                var objE = document.createElement("div");
                objE.innerHTML = res;
                $(objE).find(".TABLE_BODY .TABLE_TR_01,.TABLE_TR_02").map((index, element) => {
                    var classData = {};
                    classData["name"] = $(element).find("td")[2].innerHTML;
                    classData["type"] = String($(element).find("td")[4].innerHTML).match(/[\u4e00-\u9fa5]/g).join('');
                    var type = classData["type"];
                    if (type == '通修' || type == '平台' || type == '核心' ) {
                        classData['state'] = true;
                    } else {
                        classData['state'] = false;
                    }
                    classData["credit"] = parseInt($(element).find("td")[5].innerHTML);
                    if (isNaN(classData["credit"])) classData["credit"] = 0;

                    //debug for special cases
                    // 重修，退选
                    var temp = $(element).find("td")[6];
                    var content = temp.innerHTML;
                    if ("undefined" == typeof content){
                        content = temp.find("ul")[0].innerHTML;
                    }
                    
                    if (isChineseChar(content)){//有中文
                        var reg3 = /[\u8bfe\u7a0b\u9000\u9009]/;// 课程退选
                        if (reg3.test(content)){
                            classData["credit"] = 0;
                            classData["name"] = classData["name"] + "(退选)"
                            content = 0;
                        }
                        else{
                            var reg1 = /[\u65e0\u6548]/; //无效
                            var reg2 = /[\u91cd\u4fee]/; //重修
                            if (reg1.test(content)){
                                classData["credit"] = 0;
                                classData["name"] = classData["name"] + "(无效)"
                                content = 0;
                            }
                            else if (reg2.test(content)){
                                content = content.replace(/[^0-9]/ig,"");;
                            }
                        }
                    }
                    else{//没有中文
                        content = content.replace(/[^0-9]/ig,"");;
                    }

                    // 处理带小数点的情况
                    var grade  = parseInt(content);
                    if (grade > 100){
                        grade = grade / 10;
                    }
                    classData["grade"] = grade;
                    
                    termData.push(classData);
                });
                data[termCode] = termData;
                resolve();
            },
            error: function(e) {
                console.log(e);
                reject(e);
            }
        });
    });
}

//判断是否含有中文
function isChineseChar(str){
    var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
    return reg.test(str);
}

function getTermCodes(html) {
    var codes = [];
    $(html).find("tr [height=22] a").map(function(index, element) {
        codes.push(String(element.href).split("=")[2]);
    });
    return codes;

}

function packageData() {
    var res = [];
    Object.keys(data).forEach(element => {
        if (selectedTerm[element] == true) {
            res = res.concat(data[element]);
        }
    });
    return res;
}

//normal algorithm
function calculate() {
    var sum = 0;
    var credit = 0;

    $('#grade-table').bootstrapTable('getSelections').forEach(element => {
        sum += element['credit'] * element['grade'];
        credit += element['credit'];
    });
    if (credit == 0) return 0;
    return (sum / credit / 20.0).toFixed(4);
}

// wes algorithm
/**
 * grade   
 * 0-59   D      0.0
 * 60-74  C      2.0
 * 75-84  B      3.0
 * 85+    A      4.0
 */
function LetterGrade(grade){
    if (grade < 60){
        return 0;
    }
    else if (grade < 75){
        return 2;
    }
    else if (grade < 85){
        return 3;
    }
    else{
        return 4;
    }
}

function WesCalculate() {
    var sum = 0;
    var credit = 0;

    $('#grade-table').bootstrapTable('getSelections').forEach(element => {
        sum += LetterGrade(element['grade']) * element['credit'];
        
        credit += element['credit'];
    });
    if (credit == 0) return 0;
    return (sum / credit).toFixed(4);
}

//计算总学分
function CreditSum(){
    var credit = 0;

    $('#grade-table').bootstrapTable('getSelections').forEach(element => {
        credit += element['credit'];
    });
    return credit;
}
function formatTerm(orign) {
    year = parseInt(orign.substring(2, 4));
    return String(year) + "-" + String(year + 1) + "学年" + (orign.substring(4, 5) == '1' ? '上学期' : '下学期');
}

function render(data) {
    if (Object.keys(data).length == 0) {
        document.getElementById('toolbar').appendChild(document.createTextNode("请先在浏览器中登录教务处网站！"));
    }
    Object.keys(data).forEach((element, index) => {
        selectedTerm[element] = true;
        var label = document.createElement("label");
        label.className = "checkbox-inline";
        var input = document.createElement('input');
        var $input = $(input);
        $input.attr("type", "checkbox");
        $input.attr("value", element);
        $input.attr("checked", true);
        $(input).click(function() {
            selectedTerm[$(this).attr('value')] = $(this).prop('checked');
            console.log(selectedTerm);
            $('#grade-table').bootstrapTable('refreshOptions', { data: packageData() });
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(formatTerm(element)));
        document.getElementById("toolbar"+ parseInt(index/3)).appendChild(label);
    });
    
    var button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.appendChild(document.createTextNode("南大算法"));
    $(button).click(function() {
        alert("您的总学分为: "+ CreditSum() + "\n" +"您的学分绩为：" + calculate() + " /5.0");
        //alert(WesCalculate());
    })

    document.getElementById("toolbar").appendChild(button);


    var WesBtn=document.createElement("BUTTON");
    WesBtn.className = 'btn btn-primary';
    var t=document.createTextNode("wes 算法");
    WesBtn.appendChild(t); 
    $(WesBtn).click(function() {
        //alert(calculate());
        alert("您的总学分为: "+ CreditSum() + "\n" +"您的学分绩为：" + WesCalculate() + " /4.0");
    })
    document.getElementById("toolbar").appendChild(WesBtn)

    $('#grade-table').bootstrapTable({
        data: packageData(data),
        toolbar: "#toolbar",
        striped: true,
        cache: false,
        pagination: false,
        sortable: true,
        sortOrder: "asc",
        sidePagination: "client",
        clickToSelect: true,
        uniqueId: "name",
        cardView: false,
        detailView: false,
        rowStyle: function(row, index) {
            let classesArr = ['', 'info'];
            let strClass = "";
            if (index % 2 === 0) {
                strClass = classesArr[0];
            } else {
                strClass = classesArr[1];
            }
            return { classes: strClass };
        },
        columns: [{
                field: 'state',
                checkbox: true,
            },
            {
                field: 'name',
                title: '课程名称',
                sortable: true,
                checkbox: false,
            }, {
                field: 'type',
                title: '类型',
                sortable: true
            }, {
                field: 'credit',
                title: '学分',
            }, {
                field: 'grade',
                title: '成绩',
                sortable: true
            },
        ],
        onLoadSuccess: function() {},
        onLoadError: function() {
            alert("数据加载失败！");
        },
        onClickRow: function(row, element) {

        },
    });
}

$.ajax({
    type: 'GET',
    url: baseUrl,
    async: true,
    success: function(res) {
        var objE = document.createElement("div");
        objE.innerHTML = res;
        termCodes = getTermCodes(objE);
        Promise.all(termCodes.map(code => {
            return getTermGrade(code);
        })).then(res => {
            render(data);
        });
    },
    error: function(e) {
        console.log(e);
    }
});