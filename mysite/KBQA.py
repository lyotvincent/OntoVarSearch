import sys
sys.path.append("D:\\Users\\quz\\PycharmProjects\\KBQA")
import KBQA
from django.http import HttpResponse, JsonResponse

def domainsearch(request):
    if request.method == 'POST':
        question = request.POST.get("data")
        CQLlist=KBQA.GetCQLfromQuestion(question)
    return JsonResponse(CQLlist[0], safe=False)


