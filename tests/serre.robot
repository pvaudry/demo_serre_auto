*** Settings ***
Resource    ressources.robot
Suite Setup     Open Browser To App    ${BASE_URL}
Suite Teardown  Close All Browsers

*** Test Cases ***
Dashboard S'affiche
    Wait For Dashboard
    Page Should Contain    Interface domotique — Serre autonome
