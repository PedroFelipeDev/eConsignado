
def create_fgts_csv(filename, records):
    # 20 columns layout
    header = ["NO", "COMPETÊNCIA", "CPF", "NOME TRABALHADOR", "PIS", "MATRÍCULA", "VALOR FGTS NA GUIA", "VALOR 8", "VALOR 9", "TIPO DEPOSITO"] + ["COL" + str(i) for i in range(11, 21)]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(";".join(header) + "\n")
        for r in records:
            # Pad to 20 columns
            row = [
                r.get("NO", "1"),
                r.get("COMPETENCIA", "JAN/24"),
                r.get("CPF", "000.000.000-00"),
                r.get("NOME", "TRABALHADOR TESTE"),
                r.get("PIS", "00000000000"),
                r.get("MATRICULA", "123"),
                str(r.get("VALOR", "100.00")).replace(".", ","),
                "", "",
                r.get("TIPO", "01-Depósito mensal")
            ] + [""] * 10
            f.write(";".join(row) + "\n")

# Scenarios:
# 1. Matching record (Paid)
# 2. Non-matching value (Partial/Pendente)
# 3. 13th salary record
# 4. No paid record (Pendente)

due_records = [
    {"COMPETENCIA": "JAN/24", "CPF": "111.111.111-11", "NOME": "PEDRO TESTE", "VALOR": 150.00, "TIPO": "01-Depósito mensal"},
    {"COMPETENCIA": "FEV/24", "CPF": "111.111.111-11", "NOME": "PEDRO TESTE", "VALOR": 150.00, "TIPO": "01-Depósito mensal"},
    {"COMPETENCIA": "13o/2024", "CPF": "111.111.111-11", "NOME": "PEDRO TESTE", "VALOR": 300.00, "TIPO": "01-Depósito mensal"},
    {"COMPETENCIA": "MAR/24", "CPF": "222.222.222-22", "NOME": "MARIA TESTE", "VALOR": 200.00, "TIPO": "01-Depósito mensal"}
]

paid_records = [
    {"COMPETENCIA": "jan/24", "CPF": "11111111111", "NOME": "PEDRO TESTE", "VALOR": 150.00, "TIPO": "01-Depósito mensal"}, # Exact match
    {"COMPETENCIA": "FEV/24", "CPF": "111.111.111-11", "NOME": "PEDRO TESTE", "VALOR": 149.99, "TIPO": "01-Depósito mensal"}, # Value mismatch (Divergent/Pendente)
    {"COMPETENCIA": "13/2024", "CPF": "111.111.111-11", "NOME": "PEDRO TESTE", "VALOR": 300.00, "TIPO": "01-Depósito mensal"}  # 13th salary match
]

create_fgts_csv("due_test.csv", due_records)
create_fgts_csv("paid_test.csv", paid_records)

print("Test CSVs created.")
