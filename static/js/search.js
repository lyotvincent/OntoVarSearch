var jsondata;
// var json = {
//     "$or": [{"POS": {"$lt": 11000, "$gt": 10400}}, {
//         "GS000013208-ASM.calldata/EHQ.1": 263,
//         "GS000013208-ASM.calldata/EHQ.0": 7
//     }]
// };
var json = {
      "POS": {
        "$lt": 11000,
        "$gt": 10400
      }
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
});

function DoSearch() {
    var data = {"json_data": $('#json').val()};
    $.post('/search/dosearch',data, null, 'text').done(function (data) {
        jsondata = ParseJsonData(data);
        CreatTable('#DataTable', jsondata);
    })
}
//二级table的模板
function format2(table_id) {
    return '<table id="DataTable'+ table_id +'" class="table table-striped table-bordered table-hover" cellpadding="5" cellspacing="0" border="0"></table>';
}

function format ( d ) {
    // `d` is the original data object for the row
    return '<table id="table2" class="table table-striped table-bordered table-hover" cellpadding="5" cellspacing="0" border="0">'+
    ['    <thead>',
        '    <tr>',
        '        <th>key</th>',
        '        <th>value</th>',
        '    </tr>',
        '    </thead>'].join('') +
        // '    <tbody>',
        '<tr>' +
        '<td>Samples:</td>' +
        '<td>' + d.Samples + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Extension number:</td>' +
        '<td>' + d.extn + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Extra info:</td>' +
        '<td>And any further details here (images etc)...</td>' +
        '</tr>' +
        // '    </tbody>',
    '</table>';
}

//根据json数据 创建列
function CreatColums(data) {
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        if (rowData[k] instanceof Object){
            column.className = 'details-control';
            column.targets = -1;
            column.orderable = false;
            column.defaultContent = '';
        }
        columns.push(column);
    }
    return columns;
}

function CreatTable(tableID, data) {
    var table = $(tableID).DataTable({
        // "ajax": jsondata,
        destroy: true,
        bSort: false,
        searching: false,
        columns: CreatColums(data),
        data: data,

        "fnCreatedRow": function (nRow, aData, iDataIndex) {
            var i = 0;
            for (var k in aData){
                if (aData[k] instanceof Object){
                    $('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'></span>&nbsp;" + aData[k]);
                }
                ++i;
            }
        }
    });
    //$(tableID).on('click', ' tbody td .row-details', function () {
    $(tableID).on('click', ' tbody td.details-control', function () {

        var Tr = $(this).parents('tr');
        var row = table.row( Tr );
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            $(this).children('span').removeClass(IconMinus).addClass(IconPlus);
        }
        else {
            // Open this row (the format() function would return the data to be shown)
            ++tableIndex;
            row.child(format2(tableIndex)).show();
            $(this).children('span').removeClass(IconPlus).addClass(IconMinus);
            var tmp = [];
            tmp.push(table.cell( this ).data());
            CreatTable('#DataTable' + tableIndex, tmp);
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
        for (var key in rowData){
            switch (key) {
                case "CHROM":
                case "POS":
                case "ID":
                case "REF":
                case "QUAL":
                case "Samples":
                    rowJson[key] = rowData[key];
                    break;
                case "ALT":
                    rowJson[key] = rowData[key];
                    //rowJson[key] = rowData[key].join('');
                    break;
                default:
                    //区分filter 和 info
                    if (key.match(/^FILTER_/g)){
                        filter_row[key] = rowData[key]
                    }else{
                        info_row[key] = rowData[key];
                    }
                    break;
            }
        }
        rowJson["Info"] = info_row;
        rowJson["FILTER"] = filter_row;
        result.push(rowJson);
    }
    return result;
}