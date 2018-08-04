//var jsondata;
// var json = {
//     "$or": [{"POS": {"$lt": 11000, "$gt": 10400}}, {
//         "GS000013208-ASM.calldata/EHQ.1": 263,
//         "GS000013208-ASM.calldata/EHQ.0": 7
//     }]
// };

// var json = {
//     "POS": {
//         "$lt": 20000,
//         "$gt": 400
//     }
// };

var json ={
  "$or": [
    {
      "POS": {
        "$lt": 9000,
        "$gt": 8500
      }
    },
    {
      "POS": {
        "$lt": 6500,
        "$gt": 6000
      }
    }
  ]
};
var tableIndex = 1;
var IconPlus = "fa fa-plus-square-o";
var IconMinus = "fa fa-minus-square-o";

function printJSON() {
    $('#json').val(JSON.stringify(json,undefined,2));
}

function updateJSON(data) {
    json = data;
    printJSON();
}

function showPath(path) {
    BindAutoconplete($("input:focus"));
    $('#path').text(path);
}

$(document).ready(function() {

    $('#rest > button').click(function() {
        var url = $('#rest-url').val();
        $.ajax({
            url: url,
            dataType: 'jsonp',
            jsonp: $('#rest-callback').val(),
            success: function(data) {
                json = data;
                $('#JsonEditor').jsonEditor(json, { change: updateJSON, propertyclick: showPath });
                printJSON();
            },
            error: function() {
                alert('Something went wrong, double-check the URL and callback parameter.');
            }
        });
    });

    $('#json').change(function() {
        var val = $('#json').val();

        if (val) {
            try { json = JSON.parse(val); }
            catch (e) { alert('Error in parsing json. ' + e); }
        } else {
            json = {};
        }

        $('#JsonEditor').jsonEditor(json, { change: updateJSON, propertyclick: showPath });
    });

    $('#expander').click(function() {
        var editor = $('#JsonEditor');
        editor.toggleClass('expanded');
        $(this).text(editor.hasClass('expanded') ? 'Collapse' : 'Expand all');
    });

    printJSON();
    $('#JsonEditor').jsonEditor(json, { change: updateJSON, propertyclick: showPath });

    //BindAutoconplete()
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
        // ._renderMenu = function (ul, items) {
        //     var that = this,
        //         currentCategory = "";
        //     $.each(items, function (index, item) {
        //         if (item.category != currentCategory) {
        //             ul.append("<li class='ui-autocomplete-category'>" + item.category + "</li>");
        //             currentCategory = item.category;
        //         }
        //         that._renderItemData(ul, item);
        //     });
        // }
    })
}

function DoSearch() {
    $.busyLoadFull("show", { spinner: "accordion"});
    var data = {"json_data": $('#json').val()};
    $.post('/search/dosearch', data, null, 'text')
        .done(function (data) {
            CreatTable('#DataTable', ParseJsonData(data), true);
            $.busyLoadFull("hide");
        })
        .fail(function () {
            $.busyLoadFull("hide");
        })
}
//二级table的模板
function format2(table_id) {
    return '<table id="DataTable'+ table_id +'" class="table table-striped table-bordered table-hover" cellpadding="5" cellspacing="0" border="0"></table>';
}

//根据json数据 创建列
function CreatColums(data) {
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle ';
        if (rowData[k] instanceof Object){
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
    return columns;
}

function CreatTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
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
                {"title":"Info"},
                {"title":"Samples"}
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
        bSort: false,
        searching: false,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: bPaginate, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        columns: CreatColums(data),
        data: data,
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
            CreatTable('#DataTable' + tableIndex, tmp, false);
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
        //保证顺序 可以让datatales 按序显示
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