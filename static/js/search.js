
Render();

var Search_rownum = 1;
var tableIndex = 1;
var IconPlus = "fa fa-plus-square-o";
var IconMinus = "fa fa-minus-square-o";

$("input[id=search_disease_input]").keypress(function(e){
    var eCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
    if (eCode == 13){
        DoMainSearch();
    }
});


function Render() {
    layui.use('form', function () {
        var layer = layui.layer, form = layui.form;
        form.render();
    });
    layui.use(['layer','element'], function () {
        var element = layui.element;

    });
    Search_bind_autocomplete($("input[name='key']"),true);
}

function IsEmpty(str){
    return (str == "" || str == null || str == undefined)
}

$(document).ready(function() {

    $('.tabsholder3').cardTabs({theme: 'graygreen'});
    var GetVCFFilelist = function() {
        $.post('/download/showfiellist').done(function (data) {
            $("#Search_sel_DATABASE option").remove();
            for (let i of data){
                $("#Search_sel_DATABASE").append("<option value=" + i['collectionName'] + ">" + i['collectionName'] + "</option>");
            }
            Render();
        })
    };
    GetVCFFilelist();
});


//input加入autocomplete 绑定key
function BindAutoconplete(element) {
    $.post("/search/getkeyfield").done(function (data) {
        element.autocomplete({
            minLength: 0,
            source: data,
            disabled:false,
            focus: function (event, ui) {
                element.val(ui.item.label);
                return false;
            },
            // focus :function () {
            //     return false;
            // },
            select: function(event, ui){
                $this = $(this);
                setTimeout(function () {
                    $this.blur();
                }, 1);
            }
        }).focus(function(){
                $(this).autocomplete("search");
                return false;
            }
        )
        .data("ui-autocomplete")._renderItem = function (ul, item) {
            if (item.desc){
                return $("<li>")
                .append("<a>" + item.value + "<br>" + item.desc + "</a>")
                .appendTo(ul);
            }else{
                return $("<li>")
                .append("<a>" + item.value +"</a>")
                .appendTo(ul);
            }

        }
    })
}

function DoMainSearch() {
    $.busyLoadFull("show", { spinner: "accordion"});
    var inputgene = $('#search_disease_input').val();
    $.when(DoGeneSearch(),DoDiseaseSearch(inputgene),DoVCFSearch(inputgene)).then(function () {
        $.busyLoadFull("hide")
    });
}

function DoGeneSearch() {
    var inputgene = $('#search_disease_input').val();
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(inputgene) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var Gene = {"json_data": inputgene, "database":database};
    $.post('/search/doGeneDiseaseSearch/', Gene, null, 'json')
        .done(function (data) {
            CreatGeneDiseaseTable('#GeneDiseaseTable', data, true);
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoDiseaseSearch(DiseaseName) {
    //var inputdisease = $('#search_disease_input').val();
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(DiseaseName) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var disease = {"json_data": DiseaseName, "database":database};
    //$.busyLoadFull("show", { spinner: "accordion"});
    $.post('/search/doDiseaseSearch', disease, null, 'json')
        .done(function (data) {
            CreatDiseaseTable('#DiseaseDataTable', data, true);
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoVCFSearch(GeneName) {
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(GeneName) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    //$.busyLoadFull("show", { spinner: "accordion"});
    var geneName = {"GeneName": GeneName, "database":database};
    $.post('/search/doGeneSearch/', geneName, null, 'json')
        .done(function (data) {
            CreatVCFTable('#DataTable', data, true);
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });

    return deferred.promise();
}

//二级table的模板
function format2(table_id) {
    return '<table id="DataTable'+ table_id +'" class="table table-striped table-bordered table-hover" cellpadding="5" cellspacing="0" border="0"></table>';
}

//根据json数据 创建列
function CreatColums(data) {
    var sort_up = function (x,y) {
        return x.position - y.position;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "CHROM":
                return 0;
            case "POS":
                return 1;
            case "ID":
                return 2;
            case "REF":
                return 3;
            case "ALT":
                return 4;
            case "QUAL":
                return 5;
            case "FILTER":
                return 6;
            case "Info":
                return 7;
            case "Samples":
                return 8;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle ';
        column.position = GetColumnPos(k);

        if (rowData[k] instanceof Object && (k === 'Info' || k === 'Samples' || k === 'FILTER')){
            column.className += 'details-control';
            column.targets = -1;
            column.orderable = false;
            column.defaultContent = '';
        }
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}


function CreatGeneDiseaseColums(data) {
    var sort_up = function (x,y) {
        return x.targets - y.targets;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "entrez_gene_id":
                return 0;
            case "entrez_gene_symbol":
                return 1;
            case "HPO_Term_Name":
                return 2;
            case "HPO_Term_ID":
                return 3;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle';
        column.targets = GetColumnPos(k);
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatGeneDiseaseTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: true, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: true, // 分页
            bInfo: true, //Showing x to x of x entries
            columns:[
                {"title":"entrez_gene_id"},
                {"title":"entrez_gene_symbol"},
                {"title":"HPO_Term_Name"},
                {"title":"HPO_Term_ID"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;

    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: false,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        // columns:[
        //     {"title":"entrez_gene_id"},
        //     {"title":"entrez_gene_symbol"},
        //     {"title":"HPO_Term_Name"},
        //     {"title":"HPO_Term_ID"}
        // ],
        columns: CreatGeneDiseaseColums(data),
        data: data,
        ordering: true,
        "columnDefs": [// 定义操作列,######以下是重点########
            {
                "targets": 2,//操作按钮目标列
                "render": function (data, type, row) {
                    var DiseaseName = row.HPO_Term_Name;
                    //var html = "<a href='/search/doGeneSearch/?GeneName=" + GeneName + "'>" + GeneName + " </a>";
                    //var html = "<a href='#'  onclick='DoVCFSearch(" + GeneName + ")' >" + GeneName + "</a>"
                    var html ="<a href='#' onclick='DoDiseaseSearch(\""+ DiseaseName + "\")';>"+DiseaseName+"</a>"
                    //var html = "<a href='/search/doGeneSearch/?GeneName=" + GeneName + "' class='button button-raised button-primary'  ><i class='fa fa-cloud-download'></i> Download </a>"
                    // html += "<a href='javascript:void(0);' class='up btn btn-default btn-xs'><i class='fa fa-arrow-up'></i> 编辑</a>"
                    // html += "<a href='javascript:void(0);'   onclick='deleteThisRowPapser(" + id + ")'  class='down btn btn-default btn-xs'><i class='fa fa-arrow-down'></i> 删除</a>"
                    return html;
                }
            }]
    });
}

function CreatDiseaseColums(data) {
    var sort_up = function (x,y) {
        return x.targets - y.targets;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "Disease":
                return 0;
            case "GeneName":
                return 1;
            case "seqname":
                return 2;
            case "start":
                return 3;
            case "end":
                return 4;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle';
        column.targets = GetColumnPos(k);
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatDiseaseTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            //bSort: false,
            //searching: false,
            //bLengthChange: false,//去掉每页多少条框体
            bPaginate: true, //翻页功能
            //bAutoWidth: false,//自动宽度
            //"autoWidth": false,
            paging: true, // 分页
            bInfo: true, //Showing x to x of x entries
            columns:[
                {"title":"Disease"},
                {"title":"GeneName"},
                {"title":"seqname"},
                {"title":"start"},
                {"title":"end"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;

    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: false,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        // columns: [
        //     {"title": "Disease"},
        //     {"title": "GeneName"},
        //     {"title": "seqname"},
        //     {"title": "start"},
        //     {"title": "end"},
        // ],
        columns: CreatDiseaseColums(data),
        data: data,
        ordering: true,
        "columnDefs": [// 定义操作列,######以下是重点########
            {
                "targets": 1,//操作按钮目标列
                "render": function (data, type, row) {
                    var GeneName = row.GeneName;
                    //var html = "<a href='/search/doGeneSearch/?GeneName=" + GeneName + "'>" + GeneName + " </a>";
                    //var html = "<a href='#'  onclick='DoVCFSearch(" + GeneName + ")' >" + GeneName + "</a>"
                    var html ="<a href='#' onclick='DoVCFSearch(\""+ GeneName + "\")';>"+GeneName+"</a>"
                    //var html = "<a href='/search/doGeneSearch/?GeneName=" + GeneName + "' class='button button-raised button-primary'  ><i class='fa fa-cloud-download'></i> Download </a>"
                    // html += "<a href='javascript:void(0);' class='up btn btn-default btn-xs'><i class='fa fa-arrow-up'></i> 编辑</a>"
                    // html += "<a href='javascript:void(0);'   onclick='deleteThisRowPapser(" + id + ")'  class='down btn btn-default btn-xs'><i class='fa fa-arrow-down'></i> 删除</a>"
                    return html;
                }
            }]
    });
}


function CreatVCFTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //del previous table
        // for (var i = 1; i <= tableIndex; ++i){
        //     var datatable = $('#DataTable' + i).DataTable();
        //     if (datatable) {
        //         datatable.clear();
        //     }
        // }
        // try{
        //     $(tableID).DataTable().clear();
        // }catch(e){
        //
        // }
        if ($.fn.DataTable.isDataTable(tableID)) {
            $(tableID).DataTable().clear();
            $(tableID).DataTable().destroy();
        }

        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: true, //翻页功能
            bAutoWidth: false,//自动宽度
            //"autoWidth": false,
            paging: true, // 分页
            bInfo: true, //Showing x to x of x entries
            columns:[
                {"title":"CHROM"},
                {"title":"POS"},
                {"title":"ID"},
                {"title":"REF"},
                {"title":"ALT"},
                {"title":"QUAL"},
                {"title":"FILTER"},
                {"title":"Info"}
                // {"title":"Samples"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;
    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: false,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        columns: CreatColums(data),
        data: data,
        ordering: true,
        colReorder: {
          order: [0]
        },
        "fnCreatedRow": function (nRow, aData, iDataIndex) {
            var i = 0;
            for (var k in aData){
                var isobject = $('td:eq('+i+')', nRow).hasClass("details-control");
                if (isobject){
                    $('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'>&nbsp;" + $('td:eq('+i+')', nRow).attr("title")+"</span>");
                }
                ++i;
            }
        }
    });

    $(tableID).on('click', ' tbody td.details-control', function () {
        var OpenCell = function (obj) {
            ++tableIndex;
            row.child(format2(tableIndex)).show();
            $(obj).children('span').removeClass(IconPlus).addClass(IconMinus);
            var childdata = table.cell(obj).data();
            var tmp = [];
            if (childdata instanceof Array){
                tmp = childdata;
            }else{
                tmp.push(childdata);
            }
            CreatVCFTable('#DataTable' + tableIndex, tmp, false);
        };
        var Tr = $(this).parents('tr');
        var row = table.row(Tr);
        if (row.child.isShown()) {
            row.child.hide();
            var span = Tr.find('span.fa-minus-square-o');
            if ($(this).children('span')[0] === span[0]) {
                // This cell is already open - close it
                $(this).children('span').removeClass(IconMinus).addClass(IconPlus);
            } else {
                //other cell is open, close other cell and then open current cell
                span.removeClass(IconMinus).addClass(IconPlus);
                OpenCell(this);
            }
        }
        else {
            // Open this row (the format() function would return the data to be shown)
            OpenCell(this);
        }

    });
}


//重构返回的json数据
function ParseJsonData(strdata) {
    var data=eval('('+strdata+')');
    // var data = JSON.parse( strdata );
    var result = [];
    for (var line in data) {
        var rowJson = {};
        var info_row = {};
        var filter_row = {};
        var rowData = data[line];
        //保证顺序 可以让datatables 按序显示
        rowJson["CHROM"] = rowData["CHROM"];
        rowJson["POS"] = rowData["POS"];
        rowJson["ID"] = rowData["ID"];
        rowJson["REF"] = rowData["REF"];
        rowJson["ALT"] = rowData["ALT"];
        rowJson["QUAL"] = rowData["QUAL"];
        for (var key in rowData) {
            switch (key) {
                case "CHROM":
                case "POS":
                case "ID":
                case "REF":
                case "QUAL":
                case "Samples":
                case "ALT":
                    break;
                default:
                    //区分filter 和 info
                    if (key.match(/^FILTER_/g)) {
                        filter_row[key] = rowData[key]
                    } else {
                        info_row[key] = rowData[key];
                    }
                    break;
            }
        }
        rowJson["FILTER"] = filter_row;
        rowJson["Info"] = info_row;
        rowJson["Samples"] = rowData["Samples"];
        result.push(rowJson);
    }
    return result;
}

function Search_AddRow() {
    var html_bar = "  <div id='Search_row_" + Search_rownum + "' >" +
        "                        <div class=\"layui-inline Search_layui_inline_1 d2\">" +
        "                            <form class=\"layui-form\" action=\"\">" +
        "                                <select name=\"Search_sel_Conjunction\" lay-verify=\"\" lay-search>" +
        "                                    <option value=\"AND\" selected>AND</option>" +
        "                                    <option value=\"OR\">OR</option>" +
        "                                    <option value=\"NOT\">NOT</option>" +
        "                                </select>" +
        "                            </form>" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_2\">" +
        "                            <input type=\"text\" name=\"key\" autocomplete=\"on\" class=\"layui-input\">" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_3\">" +
        "                            <form class=\"layui-form\" action=\"\">" +
        "                                <select name=\"Search_sel_Fields\" lay-verify=\"\" lay-search" +
        "                                        lay-filter=\"lay_Search_sel_Fields\">" +
        "                                    <option value=\"eq\" selected>=</option>" +
        "                                    <option value=\"ne\">!=</option>" +
        "                                    <option value=\"gte\">&ge;</option>" +
        "                                    <option value=\"gt\">&gt;</option>" +
        "                                    <option value=\"lt\">&lt;</option>" +
        "                                    <option value=\"lte\">&le;</option>" +
        "                                </select>" +
        "                            </form>" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_4\">" +
        "                            <input type=\"text\" name=\"value\" autocomplete=\"off\" class=\"layui-input\">" +
        "                        </div>" +
        "                <div class=\"layui-inline Search_layui_inline_5\">" +
        "                    <div class=\"layui-btn-group\">" +
        "                        <button onclick='del(" + Search_rownum + ")' class=\"layui-btn layui-btn-primary layui-btn-sm\" id='Search_btn_delrow_" + Search_rownum + "'\">" +
        "                            <i class=\"layui-icon\">&#xe640;</i>" +
        "                        </button>" +
        "                    </div>" +
        "                </div>" +
        "             </div>";

    $('#exactbar_contend').append(html_bar);

    Search_rownum++;
    //render();
    layui.use('form', function() {
        var form = layui.form; //只有执行了这一步，部分表单元素才会自动修饰成功
        form.render();
    });
    Search_bind_autocomplete($("input[name='key']"),true);
}

function  del(id) {
    $("#Search_row_"+id).remove();
}

function Search_reset() {
    //删除新增的行
    $("#exactbar_contend").children().each(function () {
        var strID = $(this).attr('id');
        if (strID != null){
            var id = strID.match(/\d+/);
            del(id);
        }
    });
    //重置原有表单
    $("#exactbar_contend").children().each(function () {
        $(this).each(function () {
            $(this).find("select[name='Search_sel_Fields']").val("eq");
            $(this).find("input[name='key']").val("");
            $(this).find("input[name='value']").val("");
        });
    });
    // $("#Search_input_fuzzy").val("");
    //刷新
    layui.use('form', function() {
        var form = layui.form;
        form.render();
    });
}

function Search_exactSearch(){
    var data = new Array();
    var row=0,column=0;
    var GetDataFunc = function(){
        $("#exactbar_contend").children().each(function () {
            data[row] = new Array();
            column = 0;
            $(this).each(function () {
                if ($(this).find("select[name='Search_sel_Conjunction']").val() != null) {
                    data[row][column++] = $(this).find("select[name='Search_sel_Conjunction']").val();
                }else{
                    data[row][column++] = "AND";
                }
                data[row][column++] = $(this).find("input[name='key']").val();
                data[row][column++] = $(this).find("select[name='Search_sel_Fields']").val();
                data[row][column++] = $(this).find("input[name='value']").val();
            });
            row++;
        });
        return data;
    };
    var FormatData = function (data) {
        if (IsEmpty(data[0][1])) return data;
        for (var i in data){
            strkey = data[i][1].toUpperCase();
            if (strkey == 'POS'){
                data[i][3] = parseInt(data[i][3]);
            }
        }
        return data;
    };
    var ConvertData2Json = function(data){
        if (IsEmpty(data[0][1])) return;

        var len = data.length;
        //convert NOT to AND
        line = [];
        for (var i =0; i < len; ++i) {
            var sqlJson = {};
            if (data[i][0] == 'NOT'){
                switch (data[i][2]) {
                    case 'eq':
                        var tmp = {};
                        tmp["$not"] = data[i][3];
                        sqlJson[data[i][1].toUpperCase()] = tmp;
                        break;
                    default:
                        var tmp1 = {}, tmp2 = {};
                        tmp1["$" + data[i][2]] = data[i][3];
                        tmp2["$not"] = tmp1;
                        sqlJson[data[i][1].toUpperCase()] = tmp2;
                        break;
                }
                linedata = {};
                linedata.key = "AND";   //change to AND
                linedata.value = sqlJson;
                line.push(linedata);
            }else{
                switch (data[i][2]) {
                    case 'eq':
                        sqlJson[data[i][1].toUpperCase()] = data[i][3];
                        break;
                    default:
                        var tmp = {};
                        tmp["$" + data[i][2]] = data[i][3];
                        sqlJson[data[i][1].toUpperCase()] = tmp;
                        break;
                }
                linedata = {};
                linedata.key = data[i][0];
                linedata.value = sqlJson;
                line.push(linedata);
            }
        }
        //merge AND
        var lineAND = [];
        for (var i =0; i < line.length; ++i) {
            if (line[i]['key'] == 'AND'){
                var start = i;
                while (i + 1 < line.length) {
                    if (line[i + 1]['key'] == 'AND'){
                        i++;
                    }else{
                        var end = i;
                        var value = [];
                        for (var j = Math.max(start-1,0); j <= end; j++){
                            value.push(line[j]['value']);
                        }
                        var value_and = {};
                        value_and['$and'] = value;
                        lineAND.push(value_and);
                        break;
                    }
                }
                if (i + 1 >= line.length){
                    var end = i;
                    var value = [];
                    for (var j = Math.max(start - 1, 0); j <= end; j++) {
                        value.push(line[j]['value']);
                    }
                    var value_and = {};
                    value_and['$and'] = value;
                    lineAND.push(value_and);
                    break;
                }
            }else {
                lineAND.push(line[i]['value']);
            }
        }
        //merge OR
        if (lineAND.length != 1){
            value_or = [];
            for (var i = 0; i < lineAND.length - 1; ++i) {
                value_or.push(lineAND[i]);
            }
            var value_tmp = {};
            value_tmp['$or'] = value_or;
            var result = {};
            result = value_tmp;
            return result;
        }else{
            return lineAND[0];
        }
    };
    var data = FormatData(GetDataFunc());
    var sqljson = ConvertData2Json(data);
    var database = $('#Search_sel_DATABASE option:selected').val();
    if (IsEmpty(sqljson) || IsEmpty(database))   return;
    $.busyLoadFull("show", { spinner: "accordion"});
    var condition = {'condition': JSON.stringify(sqljson), 'database':database};
    $.post('/search/doexactSearch/', condition, null, 'json')
        .done(function (data) {
            CreatVCFTable('#DataTable', data, true);
            $.busyLoadFull("hide");
        })
        .fail(function () {
            $.busyLoadFull("hide");
        })
}

//input绑定/解除 autocomplete
function Search_bind_autocomplete(node,isbind) {
    if (isbind){
        var selsource = [
                "GENENAME",
                "CHROM",
                "POS",
                "ID",
                "QUAL"
            ];
        node.autocomplete({
            minLength: 0,
            source: selsource,
            disabled:false,
            focus :function () {
                return false;
            },
            select: function(event, ui){
                $this = $(this);
                setTimeout(function () {
                    $this.blur();
                }, 1);
            }
        }).focus(function(){
                $(this).autocomplete("search");
                return false;
            }
        );

    }else {
        node.autocomplete({
            disabled:true
        });
    }
}