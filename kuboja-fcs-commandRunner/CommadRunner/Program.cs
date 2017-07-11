using CommandLine;
using System;

namespace Kuboja.Fcs.CommadRunner
{
    internal class Program
    {
        private static Options Options;

        private static void Main(string[] args)
        {
            Options = new Options();
            if (!Parser.Default.ParseArguments(args, Options) && Options.CheckValues().Count > 0)
            {
                Options.CheckValues().ForEach(Console.WriteLine);
                // Display the default usage information
                Console.WriteLine(Options.GetUsage());
                return;
            }

            // Získání příkazu ze zdrojového souboru
            Command command = new Command(Options.FcsFilePath, Options.FcsFileLineNumber);

            if (string.IsNullOrEmpty(command.Variable))
            {
                Console.WriteLine("Chyba: neplatný příkaz!");
                return;
            }

            // Uložit soubor se spouštěcím skriptem
            string runScriptPath = FliProcessManager.CreateAndSaveScriptFile(Options.FcsFilePath, command);

            // Zobrazení aktuálního příkazu
            Console.WriteLine(command.Variable);

            // Spuštění
            FliProcessManager.StartFliProcess(Options.FliPath, new string[] { runScriptPath }, Options.Verbose);

            if (Options.Break)
            {
                Console.Write("\nPress any key for exit...");
                Console.ReadKey();
            }
        }
    }
}